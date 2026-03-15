package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"agenda-planner/backend/internal/middleware"
	"agenda-planner/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (h *Handler) ListAgendas(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	// Note: GROUP BY only on agenda columns; m.role resolved via MAX() to avoid
	// duplicate rows if a user ever has multiple member rows for the same agenda.
	// item_count uses omitempty so agendas with 0 items omit the key; frontend
	// handles this with `a.item_count ?? 0`.
	rows, err := h.DB.Query(`
		SELECT a.id, a.owner_id, a.title, a.description, a.visibility, a.created_at, a.updated_at,
		       COUNT(ai.id) AS item_count,
		       CASE WHEN a.owner_id = $1 THEN 'owner' ELSE COALESCE(MAX(m.role), '') END AS role
		FROM agendas a
		LEFT JOIN agenda_members m ON m.agenda_id = a.id AND m.user_id = $1
		LEFT JOIN agenda_items ai ON ai.agenda_id = a.id
		WHERE a.owner_id = $1 OR m.user_id = $1
		GROUP BY a.id, a.owner_id, a.title, a.description, a.visibility, a.created_at, a.updated_at
		ORDER BY a.updated_at DESC
	`, userID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var list []models.Agenda
	for rows.Next() {
		var a models.Agenda
		var desc *string
		if err := rows.Scan(&a.ID, &a.OwnerID, &a.Title, &desc, &a.Visibility, &a.CreatedAt, &a.UpdatedAt, &a.ItemCount, &a.Role); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		a.Description = desc
		list = append(list, a)
	}
	if list == nil {
		list = []models.Agenda{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *Handler) CreateAgenda(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req models.CreateAgendaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		jsonError(w, "title required", http.StatusBadRequest)
		return
	}
	visibility := "private"
	if req.Visibility != nil && *req.Visibility != "" {
		visibility = *req.Visibility
	}
	id := uuid.New().String()
	_, err := h.DB.Exec(`
		INSERT INTO agendas (id, owner_id, title, description, visibility)
		VALUES ($1, $2, $3, $4, $5)
	`, id, userID, req.Title, req.Description, visibility)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var a models.Agenda
	err = h.DB.QueryRow(`
		SELECT id, owner_id, title, description, visibility, created_at, updated_at
		FROM agendas WHERE id = $1
	`, id).Scan(&a.ID, &a.OwnerID, &a.Title, &a.Description, &a.Visibility, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(a)
}

func (h *Handler) GetAgenda(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		jsonError(w, "agenda id required", http.StatusBadRequest)
		return
	}
	userID, hasAuth := middleware.GetUserID(r.Context())
	canView := false
	if hasAuth {
		var ownerID string
		err := h.DB.QueryRow("SELECT owner_id FROM agendas WHERE id = $1", id).Scan(&ownerID)
		if err != nil {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		if ownerID == userID {
			canView = true
		} else {
			var role string
			err = h.DB.QueryRow("SELECT role FROM agenda_members WHERE agenda_id = $1 AND user_id = $2", id, userID).Scan(&role)
			canView = (err == nil)
		}
	}
	if !canView {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}
	var a models.Agenda
	var desc *string
	err := h.DB.QueryRow(`
		SELECT id, owner_id, title, description, visibility, created_at, updated_at FROM agendas WHERE id = $1
	`, id).Scan(&a.ID, &a.OwnerID, &a.Title, &desc, &a.Visibility, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	a.Description = desc
	rows, err := h.DB.Query(`
		SELECT id, agenda_id, title, description, location, date::text, start_time::text, end_time::text, created_at, updated_at
		FROM agenda_items WHERE agenda_id = $1 ORDER BY date, start_time
	`, id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var item models.AgendaItem
		var idesc, loc, et *string
		if err := rows.Scan(&item.ID, &item.AgendaID, &item.Title, &idesc, &loc, &item.Date, &item.StartTime, &et, &item.CreatedAt, &item.UpdatedAt); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		item.Description = idesc
		item.Location = loc
		item.EndTime = et
		a.Items = append(a.Items, item)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(a)
}

func (h *Handler) UpdateAgenda(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		jsonError(w, "agenda id required", http.StatusBadRequest)
		return
	}
	if !h.canEditAgenda(r.Context(), id, userID) {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}
	var req models.UpdateAgendaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	var set []string
	var args []interface{}
	n := 1
	if req.Title != nil {
		set = append(set, "title = $"+fmtPos(n))
		args = append(args, *req.Title)
		n++
	}
	if req.Description != nil {
		set = append(set, "description = $"+fmtPos(n))
		args = append(args, *req.Description)
		n++
	}
	if req.Visibility != nil {
		set = append(set, "visibility = $"+fmtPos(n))
		args = append(args, *req.Visibility)
		n++
	}
	if len(set) == 0 {
		h.GetAgenda(w, r)
		return
	}
	set = append(set, "updated_at = NOW()")
	args = append(args, id)
	q := "UPDATE agendas SET " + strings.Join(set, ", ") + " WHERE id = $"+fmtPos(n)
	_, err := h.DB.Exec(q, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	h.GetAgenda(w, r)
}

func (h *Handler) DeleteAgenda(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		jsonError(w, "agenda id required", http.StatusBadRequest)
		return
	}
	var ownerID string
	err := h.DB.QueryRow("SELECT owner_id FROM agendas WHERE id = $1", id).Scan(&ownerID)
	if err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	if ownerID != userID {
		jsonError(w, "only owner can delete", http.StatusForbidden)
		return
	}
	_, err = h.DB.Exec("DELETE FROM agendas WHERE id = $1", id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
