package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"agenda-planner/backend/internal/db"
	"agenda-planner/backend/internal/handlers"
	"agenda-planner/backend/internal/middleware"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgres@localhost:5432/agendaplanner?sslmode=disable"
	}
	jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("SUPABASE_JWT_SECRET is required")
	}
	supabaseURL := os.Getenv("SUPABASE_URL") // used to fetch JWKS for ES256 tokens
	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	database, err := db.New(databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	h := &handlers.Handler{DB: database}
	auth := middleware.Auth(jwtSecret, supabaseURL)
	optionalAuth := middleware.OptionalAuth(jwtSecret, supabaseURL)

	r := chi.NewRouter()
	r.Use(makeCORSMiddleware(allowedOrigin))
	r.Use(chimw.RealIP, chimw.Logger, chimw.Recoverer)
	r.Use(chimw.SetHeader("Content-Type", "application/json"))

	r.Route("/auth", func(r chi.Router) {
		r.With(auth).Post("/sync", h.AuthSync)
	})

	r.Route("/agendas", func(r chi.Router) {
		r.With(auth).Get("/", h.ListAgendas)
		r.With(auth).Post("/", h.CreateAgenda)
		r.With(auth).Get("/{id}", h.GetAgenda)
		r.With(auth).Patch("/{id}", h.UpdateAgenda)
		r.With(auth).Delete("/{id}", h.DeleteAgenda)
		r.With(auth).Post("/{id}/items", h.CreateItem)
		r.With(auth).Patch("/{id}/items/{itemId}", h.UpdateItem)
		r.With(auth).Delete("/{id}/items/{itemId}", h.DeleteItem)
		r.With(auth).Post("/{id}/share", h.CreateShareToken)
		r.With(auth).Get("/{id}/members", h.ListMembers)
		r.With(auth).Patch("/{id}/members/{userId}", h.UpdateMember)
	})

	r.Get("/share/{token}", h.ShareByToken)

	r.Route("/items", func(r chi.Router) {
		r.With(optionalAuth).Get("/{itemId}/comments", h.GetComments)
		r.With(optionalAuth).Post("/{itemId}/comments", h.CreateComment)
	})
	r.With(auth).Delete("/comments/{commentId}", h.DeleteComment)

	log.Printf("Listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

// makeCORSMiddleware returns a middleware that only allows the configured origin.
// allowedOrigin may be a comma-separated list (e.g. "https://a.com,https://b.com").
// If empty, requests from localhost are allowed to support local development.
func makeCORSMiddleware(allowedOrigin string) func(http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, o := range strings.Split(allowedOrigin, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			allowed[o] = true
		}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				ok := allowed[origin]
				if !ok && len(allowed) == 0 && strings.HasPrefix(origin, "http://localhost") {
					ok = true // allow localhost when no origin is configured
				}
				if ok {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Vary", "Origin")
					w.Header().Set("Access-Control-Allow-Credentials", "true")
					w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
					w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Share-Token")
				}
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
