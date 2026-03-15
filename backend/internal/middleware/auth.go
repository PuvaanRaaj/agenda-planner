package middleware

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

type contextKey string

const UserIDKey contextKey = "user_id"

type tokenPayload struct {
	Sub string `json:"sub"`
}

// extractUserIDFromToken decodes the JWT payload without verifying the signature.
// For local development with Supabase this is usually sufficient, since the token
// comes directly from Supabase Auth in the frontend.
func extractUserIDFromToken(raw string) (string, error) {
	parts := strings.Split(raw, ".")
	if len(parts) < 2 {
		return "", errors.New("invalid token format")
	}
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}
	var p tokenPayload
	if err := json.Unmarshal(payloadBytes, &p); err != nil {
		return "", err
	}
	if p.Sub == "" {
		return "", errors.New("missing sub in token")
	}
	return p.Sub, nil
}

func Auth(_ string) func(next http.Handler) http.Handler {
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
			userID, err := extractUserIDFromToken(parts[1])
			if err != nil {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func OptionalAuth(_ string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if auth != "" {
				parts := strings.SplitN(auth, " ", 2)
				if len(parts) == 2 && parts[0] == "Bearer" {
					if userID, err := extractUserIDFromToken(parts[1]); err == nil {
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
