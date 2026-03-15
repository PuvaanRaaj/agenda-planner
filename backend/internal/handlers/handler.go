package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
)

type Handler struct {
	DB *sql.DB
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// internalError logs the real error and returns a generic 500 to the client
// so that database internals are never exposed.
func internalError(w http.ResponseWriter, err error) {
	log.Printf("internal error: %v", err)
	jsonError(w, "internal server error", http.StatusInternalServerError)
}

func fmtPos(n int) string {
	return strconv.Itoa(n)
}

// suppress unused import of fmt in case callers still use it
var _ = fmt.Sprintf

func (h *Handler) canEditAgenda(ctx context.Context, agendaID, userID string) bool {
	var ownerID string
	if err := h.DB.QueryRow("SELECT owner_id FROM agendas WHERE id = $1", agendaID).Scan(&ownerID); err != nil {
		return false
	}
	if ownerID == userID {
		return true
	}
	var role string
	if err := h.DB.QueryRow("SELECT role FROM agenda_members WHERE agenda_id = $1 AND user_id = $2", agendaID, userID).Scan(&role); err != nil {
		return false
	}
	return role == "editor"
}

func (h *Handler) canCommentByToken(agendaID, token string) bool {
	var expiresAt *time.Time
	var permission string
	err := h.DB.QueryRow(`
		SELECT permission, expires_at FROM share_tokens WHERE agenda_id = $1 AND token = $2`,
		agendaID, token).Scan(&permission, &expiresAt)
	if err != nil {
		return false
	}
	if expiresAt != nil && time.Now().After(*expiresAt) {
		return false
	}
	return permission == "comment" || permission == "edit"
}

func (h *Handler) canViewByToken(agendaID, token string) bool {
	var expiresAt *time.Time
	var permission string
	err := h.DB.QueryRow(`
		SELECT permission, expires_at FROM share_tokens WHERE agenda_id = $1 AND token = $2`,
		agendaID, token).Scan(&permission, &expiresAt)
	if err != nil {
		return false
	}
	if expiresAt != nil && time.Now().After(*expiresAt) {
		return false
	}
	return permission == "view" || permission == "comment" || permission == "edit"
}

// planAgendaLimit returns the max agendas allowed for a plan.
// Returns -1 for unlimited.
func planAgendaLimit(plan string) int {
	switch plan {
	case "starter":
		return 5
	case "basic":
		return 10
	case "pro":
		return -1
	default: // free
		return 3
	}
}
