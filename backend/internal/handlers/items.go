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

func (h *Handler) CreateItem(w http.ResponseWriter, r *http.Request) {
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
	if !h.canEditAgenda(r.Context(), agendaID, userID) {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}
	var req models.CreateItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Title == "" || req.Date == "" || req.StartTime == "" {
		jsonError(w, "title, date, start_time required", http.StatusBadRequest)
		return
	}
	itemID := uuid.New().String()
	_, err := h.DB.Exec(`
		INSERT INTO agenda_items (id, agenda_id, title, description, location, date, start_time, end_time)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, itemID, agendaID, req.Title, req.Description, req.Location, req.Date, req.StartTime, req.EndTime)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var item models.AgendaItem
	err = h.DB.QueryRow(`
		SELECT id, agenda_id, title, description, location, date::text, start_time::text, end_time::text, created_at, updated_at
		FROM agenda_items WHERE id = $1
	`, itemID).Scan(&item.ID, &item.AgendaID, &item.Title, &item.Description, &item.Location, &item.Date, &item.StartTime, &item.EndTime, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

func (h *Handler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	agendaID := chi.URLParam(r, "id")
	itemID := chi.URLParam(r, "itemId")
	if agendaID == "" || itemID == "" {
		jsonError(w, "agenda id and item id required", http.StatusBadRequest)
		return
	}
	if !h.canEditAgenda(r.Context(), agendaID, userID) {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}
	var req models.UpdateItemRequest
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
	if req.Location != nil {
		set = append(set, "location = $"+fmtPos(n))
		args = append(args, *req.Location)
		n++
	}
	if req.Date != nil {
		set = append(set, "date = $"+fmtPos(n))
		args = append(args, *req.Date)
		n++
	}
	if req.StartTime != nil {
		set = append(set, "start_time = $"+fmtPos(n))
		args = append(args, *req.StartTime)
		n++
	}
	if req.EndTime != nil {
		set = append(set, "end_time = $"+fmtPos(n))
		args = append(args, *req.EndTime)
		n++
	}
	if len(set) == 0 {
		var item models.AgendaItem
		var idesc, loc, et *string
		err := h.DB.QueryRow(`
			SELECT id, agenda_id, title, description, location, date::text, start_time::text, end_time::text, created_at, updated_at
			FROM agenda_items WHERE id = $1 AND agenda_id = $2
		`, itemID, agendaID).Scan(&item.ID, &item.AgendaID, &item.Title, &idesc, &loc, &item.Date, &item.StartTime, &et, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		item.Description = idesc
		item.Location = loc
		item.EndTime = et
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(item)
		return
	}
	set = append(set, "updated_at = NOW()")
	args = append(args, itemID, agendaID)
	q := "UPDATE agenda_items SET " + strings.Join(set, ", ") + " WHERE id = $"+fmtPos(n)+" AND agenda_id = $"+fmtPos(n+1)
	_, err := h.DB.Exec(q, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var item models.AgendaItem
	var idesc, loc, et *string
	err = h.DB.QueryRow(`
		SELECT id, agenda_id, title, description, location, date::text, start_time::text, end_time::text, created_at, updated_at
		FROM agenda_items WHERE id = $1 AND agenda_id = $2
	`, itemID, agendaID).Scan(&item.ID, &item.AgendaID, &item.Title, &idesc, &loc, &item.Date, &item.StartTime, &et, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	item.Description = idesc
	item.Location = loc
	item.EndTime = et
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func (h *Handler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	agendaID := chi.URLParam(r, "id")
	itemID := chi.URLParam(r, "itemId")
	if agendaID == "" || itemID == "" {
		jsonError(w, "agenda id and item id required", http.StatusBadRequest)
		return
	}
	if !h.canEditAgenda(r.Context(), agendaID, userID) {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}
	res, err := h.DB.Exec("DELETE FROM agenda_items WHERE id = $1 AND agenda_id = $2", itemID, agendaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	ra, _ := res.RowsAffected()
	if ra == 0 {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
