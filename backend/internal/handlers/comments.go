package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"agenda-planner/backend/internal/middleware"
	"agenda-planner/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (h *Handler) GetComments(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	if itemID == "" {
		jsonError(w, "item id required", http.StatusBadRequest)
		return
	}
	var agendaID string
	if err := h.DB.QueryRow("SELECT agenda_id FROM agenda_items WHERE id = $1", itemID).Scan(&agendaID); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	userID, hasAuth := middleware.GetUserID(r.Context())
	canView := false
	if hasAuth {
		var ownerID string
		if err := h.DB.QueryRow("SELECT owner_id FROM agendas WHERE id = $1", agendaID).Scan(&ownerID); err == nil {
			if ownerID == userID {
				canView = true
			} else {
				var role string
				if h.DB.QueryRow("SELECT role FROM agenda_members WHERE agenda_id = $1 AND user_id = $2", agendaID, userID).Scan(&role) == nil {
					canView = true
				}
			}
		}
	}
	if !canView {
		token := r.Header.Get("X-Share-Token")
		// Any permission level (view/comment/edit) may read comments
		if token != "" && h.canViewByToken(agendaID, token) {
			canView = true
		}
	}
	if !canView {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}
	rows, err := h.DB.Query(`
		SELECT c.id, c.item_id, c.user_id, c.body, c.created_at, u.email, u.name
		FROM comments c
		LEFT JOIN users u ON u.id = c.user_id
		WHERE c.item_id = $1
		ORDER BY c.created_at ASC
	`, itemID)
	if err != nil {
		internalError(w, err)
		return
	}
	defer rows.Close()
	list := []models.Comment{}
	for rows.Next() {
		var c models.Comment
		var name *string
		var userIDNull sql.NullString
		if err := rows.Scan(&c.ID, &c.ItemID, &userIDNull, &c.Body, &c.CreatedAt, &c.Email, &name); err != nil {
			internalError(w, err)
			return
		}
		if userIDNull.Valid {
			c.UserID = userIDNull.String
		}
		c.Name = name
		list = append(list, c)
	}
	if err := rows.Err(); err != nil {
		internalError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *Handler) CreateComment(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	if itemID == "" {
		jsonError(w, "item id required", http.StatusBadRequest)
		return
	}
	var agendaID string
	if err := h.DB.QueryRow("SELECT agenda_id FROM agenda_items WHERE id = $1", itemID).Scan(&agendaID); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	userID, hasAuth := middleware.GetUserID(r.Context())
	shareToken := r.Header.Get("X-Share-Token")
	canComment := false
	if hasAuth {
		var ownerID string
		if err := h.DB.QueryRow("SELECT owner_id FROM agendas WHERE id = $1", agendaID).Scan(&ownerID); err == nil {
			if ownerID == userID {
				canComment = true
			} else {
				var role string
				if h.DB.QueryRow("SELECT role FROM agenda_members WHERE agenda_id = $1 AND user_id = $2", agendaID, userID).Scan(&role) == nil {
					canComment = (role == "commenter" || role == "editor")
				}
			}
		}
	}
	if !canComment && shareToken != "" {
		canComment = h.canCommentByToken(agendaID, shareToken)
	}
	if !canComment {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}
	var req models.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Body == "" {
		jsonError(w, "body required", http.StatusBadRequest)
		return
	}
	id := uuid.New().String()
	var err error
	if userID != "" {
		_, err = h.DB.Exec(`
			INSERT INTO comments (id, item_id, user_id, body)
			VALUES ($1, $2, $3, $4)
		`, id, itemID, userID, req.Body)
	} else {
		_, err = h.DB.Exec(`
			INSERT INTO comments (id, item_id, body)
			VALUES ($1, $2, $3)
		`, id, itemID, req.Body)
	}
	if err != nil {
		internalError(w, err)
		return
	}
	var c models.Comment
	var name *string
	var userIDNull sql.NullString
	err = h.DB.QueryRow(`
		SELECT c.id, c.item_id, c.user_id, c.body, c.created_at, u.email, u.name
		FROM comments c
		LEFT JOIN users u ON u.id = c.user_id
		WHERE c.id = $1
	`, id).Scan(&c.ID, &c.ItemID, &userIDNull, &c.Body, &c.CreatedAt, &c.Email, &name)
	if err != nil {
		internalError(w, err)
		return
	}
	if userIDNull.Valid {
		c.UserID = userIDNull.String
	}
	c.Name = name
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(c)
}

func (h *Handler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	commentID := chi.URLParam(r, "commentId")
	if commentID == "" {
		jsonError(w, "comment id required", http.StatusBadRequest)
		return
	}
	// user_id is nullable (ON DELETE SET NULL); use NullString to avoid scan error
	var commentUserID sql.NullString
	if err := h.DB.QueryRow("SELECT user_id FROM comments WHERE id = $1", commentID).Scan(&commentUserID); err != nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	// Only the comment author may delete it
	if !commentUserID.Valid || commentUserID.String != userID {
		jsonError(w, "can only delete own comment", http.StatusForbidden)
		return
	}
	_, err := h.DB.Exec("DELETE FROM comments WHERE id = $1", commentID)
	if err != nil {
		internalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
