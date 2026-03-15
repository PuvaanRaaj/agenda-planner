package handlers

import (
	"encoding/json"
	"net/http"

	"agenda-planner/backend/internal/middleware"
	"agenda-planner/backend/internal/models"
)

func (h *Handler) AuthSync(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req models.AuthSyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.ID == "" || req.Email == "" {
		jsonError(w, "id and email required", http.StatusBadRequest)
		return
	}
	if req.ID != userID {
		jsonError(w, "id must match token sub", http.StatusForbidden)
		return
	}
	_, err := h.DB.Exec(`
		INSERT INTO users (id, email, name)
		VALUES ($1, $2, $3)
		ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
	`, req.ID, req.Email, req.Name)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
