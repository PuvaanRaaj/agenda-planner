package models

import "time"

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      *string   `json:"name,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Agenda struct {
	ID          string       `json:"id"`
	OwnerID     string       `json:"owner_id"`
	Title       string       `json:"title"`
	Description *string      `json:"description,omitempty"`
	Visibility  string       `json:"visibility"`
	ItemCount   int          `json:"item_count,omitempty"`
	Role        string       `json:"role,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
	Items       []AgendaItem `json:"items,omitempty"`
}

type AgendaItem struct {
	ID          string     `json:"id"`
	AgendaID    string     `json:"agenda_id"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	Location    *string    `json:"location,omitempty"`
	Date        string     `json:"date"`
	StartTime   string     `json:"start_time"`
	EndTime     *string    `json:"end_time,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ShareToken struct {
	ID         string     `json:"id"`
	AgendaID   string     `json:"agenda_id"`
	Token      string     `json:"token"`
	Permission string     `json:"permission"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

type AgendaMember struct {
	ID       string `json:"id"`
	AgendaID string `json:"agenda_id"`
	UserID   string `json:"user_id"`
	Role     string `json:"role"`
	Email    string `json:"email,omitempty"`
	Name     *string `json:"name,omitempty"`
}

type Comment struct {
	ID        string    `json:"id"`
	ItemID    string    `json:"item_id"`
	UserID    string    `json:"user_id"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
	Email     string    `json:"email,omitempty"`
	Name      *string   `json:"name,omitempty"`
}

// Request/response DTOs
type CreateAgendaRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	Visibility  *string `json:"visibility,omitempty"`
}

type UpdateAgendaRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Visibility  *string `json:"visibility,omitempty"`
}

type CreateItemRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
	Location    *string `json:"location,omitempty"`
	Date        string  `json:"date"`
	StartTime   string  `json:"start_time"`
	EndTime     *string `json:"end_time,omitempty"`
}

type UpdateItemRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Location    *string `json:"location,omitempty"`
	Date        *string `json:"date,omitempty"`
	StartTime   *string `json:"start_time,omitempty"`
	EndTime     *string `json:"end_time,omitempty"`
}

type CreateShareRequest struct {
	Permission string  `json:"permission"`
	ExpiresAt  *string `json:"expires_at,omitempty"`
}

type UpdateMemberRequest struct {
	Role string `json:"role"`
}

type CreateCommentRequest struct {
	Body string `json:"body"`
}

type AuthSyncRequest struct {
	ID    string  `json:"id"`
	Email string  `json:"email"`
	Name  *string `json:"name,omitempty"`
}
