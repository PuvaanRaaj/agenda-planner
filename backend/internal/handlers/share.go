package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"agenda-planner/backend/internal/middleware"
	"agenda-planner/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (h *Handler) ShareByToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		jsonError(w, "token required", http.StatusBadRequest)
		return
	}
	var agendaID string
	var permission string
	var expiresAt *time.Time
	err := h.DB.QueryRow(`
		SELECT agenda_id, permission, expires_at FROM share_tokens WHERE token = $1
	`, token).Scan(&agendaID, &permission, &expiresAt)
	if err == sql.ErrNoRows {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err)
		return
	}
	if expiresAt != nil && time.Now().After(*expiresAt) {
		jsonError(w, "token expired", http.StatusGone)
		return
	}
	var a models.Agenda
	var desc *string
	err = h.DB.QueryRow(`
		SELECT id, owner_id, title, description, visibility, created_at, updated_at FROM agendas WHERE id = $1
	`, agendaID).Scan(&a.ID, &a.OwnerID, &a.Title, &desc, &a.Visibility, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	a.Description = desc
	rows, err := h.DB.Query(`
		SELECT id, agenda_id, title, description, location, date::text, start_time::text, end_time::text, created_at, updated_at
		FROM agenda_items WHERE agenda_id = $1 ORDER BY date, start_time
	`, agendaID)
	if err != nil {
		internalError(w, err)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var item models.AgendaItem
		var idesc, loc, et *string
		if err := rows.Scan(&item.ID, &item.AgendaID, &item.Title, &idesc, &loc, &item.Date, &item.StartTime, &et, &item.CreatedAt, &item.UpdatedAt); err != nil {
			internalError(w, err)
			return
		}
		item.Description = idesc
		item.Location = loc
		item.EndTime = et
		a.Items = append(a.Items, item)
	}
	if err := rows.Err(); err != nil {
		internalError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"permission": permission, "agenda": a})
}

func (h *Handler) CreateShareToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	agendaID := chi.URLParam(r, "id")
	if agendaID == "" {
		jsonError(w, "agenda id required", http.StatusBadRequest)
		return
	}
	var ownerID string
	if err := h.DB.QueryRow("SELECT owner_id FROM agendas WHERE id = $1", agendaID).Scan(&ownerID); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	if ownerID != userID {
		jsonError(w, "only owner can create share links", http.StatusForbidden)
		return
	}
	var req models.CreateShareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Permission == "" {
		req.Permission = "view"
	}
	if req.Permission != "view" && req.Permission != "comment" && req.Permission != "edit" {
		jsonError(w, "permission must be view, comment, or edit", http.StatusBadRequest)
		return
	}
	token := uuid.New().String()
	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			jsonError(w, "invalid expires_at format", http.StatusBadRequest)
			return
		}
		expiresAt = &t
	}
	_, err := h.DB.Exec(`
		INSERT INTO share_tokens (id, agenda_id, token, permission, expires_at)
		VALUES ($1, $2, $3, $4, $5)
	`, uuid.New().String(), agendaID, token, req.Permission, expiresAt)
	if err != nil {
		internalError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func (h *Handler) ListMembers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	agendaID := chi.URLParam(r, "id")
	if agendaID == "" {
		jsonError(w, "agenda id required", http.StatusBadRequest)
		return
	}
	var ownerID string
	if err := h.DB.QueryRow("SELECT owner_id FROM agendas WHERE id = $1", agendaID).Scan(&ownerID); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	if ownerID != userID {
		var role string
		if err := h.DB.QueryRow("SELECT role FROM agenda_members WHERE agenda_id = $1 AND user_id = $2", agendaID, userID).Scan(&role); err != nil {
			jsonError(w, "forbidden", http.StatusForbidden)
			return
		}
	}
	rows, err := h.DB.Query(`
		SELECT m.id, m.agenda_id, m.user_id, m.role, u.email, u.name
		FROM agenda_members m
		JOIN users u ON u.id = m.user_id
		WHERE m.agenda_id = $1
	`, agendaID)
	if err != nil {
		internalError(w, err)
		return
	}
	defer rows.Close()
	list := []models.AgendaMember{}
	for rows.Next() {
		var m models.AgendaMember
		var name *string
		if err := rows.Scan(&m.ID, &m.AgendaID, &m.UserID, &m.Role, &m.Email, &name); err != nil {
			internalError(w, err)
			return
		}
		m.Name = name
		list = append(list, m)
	}
	if err := rows.Err(); err != nil {
		internalError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *Handler) UpdateMember(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	agendaID := chi.URLParam(r, "id")
	memberUserID := chi.URLParam(r, "userId")
	if agendaID == "" || memberUserID == "" {
		jsonError(w, "agenda id and user id required", http.StatusBadRequest)
		return
	}
	var ownerID string
	if err := h.DB.QueryRow("SELECT owner_id FROM agendas WHERE id = $1", agendaID).Scan(&ownerID); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	if ownerID != userID {
		jsonError(w, "only owner can update members", http.StatusForbidden)
		return
	}
	var req models.UpdateMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Role != "viewer" && req.Role != "commenter" && req.Role != "editor" {
		jsonError(w, "role must be viewer, commenter, or editor", http.StatusBadRequest)
		return
	}
	res, err := h.DB.Exec(`
		UPDATE agenda_members SET role = $1 WHERE agenda_id = $2 AND user_id = $3
	`, req.Role, agendaID, memberUserID)
	if err != nil {
		internalError(w, err)
		return
	}
	if ra, _ := res.RowsAffected(); ra == 0 {
		jsonError(w, "member not found", http.StatusNotFound)
		return
	}
	var m models.AgendaMember
	var name *string
	err = h.DB.QueryRow(`
		SELECT m.id, m.agenda_id, m.user_id, m.role, u.email, u.name
		FROM agenda_members m
		JOIN users u ON u.id = m.user_id
		WHERE m.agenda_id = $1 AND m.user_id = $2
	`, agendaID, memberUserID).Scan(&m.ID, &m.AgendaID, &m.UserID, &m.Role, &m.Email, &name)
	if err != nil {
		internalError(w, err)
		return
	}
	m.Name = name
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m)
}
