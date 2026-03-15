package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	gojwt "github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"

// jwksCache holds fetched public keys keyed by kid, with a simple TTL.
type jwksCache struct {
	mu      sync.RWMutex
	keys    map[string]*ecdsa.PublicKey
	fetched time.Time
	ttl     time.Duration
}

var cache = &jwksCache{
	keys: map[string]*ecdsa.PublicKey{},
	ttl:  10 * time.Minute,
}

type jwkKey struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

type jwksDoc struct {
	Keys []jwkKey `json:"keys"`
}

func (c *jwksCache) getKey(kid, jwksURL string) (*ecdsa.PublicKey, error) {
	c.mu.RLock()
	if time.Since(c.fetched) < c.ttl {
		k := c.keys[kid]
		c.mu.RUnlock()
		if k != nil {
			return k, nil
		}
	} else {
		c.mu.RUnlock()
	}
	// Refresh cache
	c.mu.Lock()
	defer c.mu.Unlock()
	resp, err := http.Get(jwksURL) //nolint:gosec
	if err != nil {
		return nil, fmt.Errorf("fetching jwks: %w", err)
	}
	defer resp.Body.Close()
	var doc jwksDoc
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return nil, fmt.Errorf("parsing jwks: %w", err)
	}
	c.keys = map[string]*ecdsa.PublicKey{}
	for _, k := range doc.Keys {
		if k.Kty != "EC" || k.Crv != "P-256" {
			continue
		}
		xBytes, err1 := base64.RawURLEncoding.DecodeString(k.X)
		yBytes, err2 := base64.RawURLEncoding.DecodeString(k.Y)
		if err1 != nil || err2 != nil {
			continue
		}
		pub := &ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     new(big.Int).SetBytes(xBytes),
			Y:     new(big.Int).SetBytes(yBytes),
		}
		c.keys[k.Kid] = pub
	}
	c.fetched = time.Now()
	if k := c.keys[kid]; k != nil {
		return k, nil
	}
	return nil, fmt.Errorf("key %q not found in jwks", kid)
}

type verifier struct {
	hmacSecret string
	jwksURL    string
}

func newVerifier(hmacSecret, supabaseURL string) *verifier {
	jwksURL := ""
	if supabaseURL != "" {
		jwksURL = strings.TrimRight(supabaseURL, "/") + "/auth/v1/.well-known/jwks.json"
	}
	return &verifier{hmacSecret: hmacSecret, jwksURL: jwksURL}
}

type jwtHeader struct {
	Alg string `json:"alg"`
	Kid string `json:"kid"`
}

func (v *verifier) verifyAndExtractUserID(raw string) (string, error) {
	parts := strings.Split(raw, ".")
	if len(parts) != 3 {
		return "", errors.New("invalid token format")
	}
	// Decode header to determine algorithm
	hdrBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", errors.New("invalid token header")
	}
	var hdr jwtHeader
	if err := json.Unmarshal(hdrBytes, &hdr); err != nil {
		return "", errors.New("invalid token header")
	}

	var claims gojwt.MapClaims
	switch hdr.Alg {
	case "HS256":
		token, err := gojwt.ParseWithClaims(raw, &claims, func(t *gojwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*gojwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(v.hmacSecret), nil
		})
		if err != nil || !token.Valid {
			return "", errors.New("invalid token")
		}
	case "ES256":
		if v.jwksURL == "" {
			return "", errors.New("SUPABASE_URL required for ES256 token verification")
		}
		pub, err := cache.getKey(hdr.Kid, v.jwksURL)
		if err != nil {
			return "", fmt.Errorf("resolving signing key: %w", err)
		}
		token, err := gojwt.ParseWithClaims(raw, &claims, func(t *gojwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*gojwt.SigningMethodECDSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return pub, nil
		})
		if err != nil || !token.Valid {
			return "", errors.New("invalid token")
		}
	default:
		return "", fmt.Errorf("unsupported algorithm: %s", hdr.Alg)
	}

	sub, err := claims.GetSubject()
	if err != nil || sub == "" {
		return "", errors.New("missing sub in token")
	}
	return sub, nil
}

// Shared verifier instance; set once by Auth/OptionalAuth.
var globalVerifier *verifier
var verifierOnce sync.Once

func initVerifier(secret, supabaseURL string) *verifier {
	verifierOnce.Do(func() {
		globalVerifier = newVerifier(secret, supabaseURL)
	})
	return globalVerifier
}

func Auth(secret string, supabaseURL ...string) func(next http.Handler) http.Handler {
	url := ""
	if len(supabaseURL) > 0 {
		url = supabaseURL[0]
	}
	v := initVerifier(secret, url)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if auth == "" {
				http.Error(w, `{"error":"missing authorization"}`, http.StatusUnauthorized)
				return
			}
			parts := strings.SplitN(auth, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
				return
			}
			userID, err := v.verifyAndExtractUserID(parts[1])
			if err != nil {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func OptionalAuth(secret string, supabaseURL ...string) func(next http.Handler) http.Handler {
	url := ""
	if len(supabaseURL) > 0 {
		url = supabaseURL[0]
	}
	v := initVerifier(secret, url)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if auth != "" {
				parts := strings.SplitN(auth, " ", 2)
				if len(parts) == 2 && parts[0] == "Bearer" {
					if userID, err := v.verifyAndExtractUserID(parts[1]); err == nil {
						ctx := context.WithValue(r.Context(), UserIDKey, userID)
						r = r.WithContext(ctx)
					}
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func GetUserID(ctx context.Context) (string, bool) {
	v := ctx.Value(UserIDKey)
	if v == nil {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}
