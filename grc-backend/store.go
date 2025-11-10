package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Store holds the database connection pool
type Store struct {
	db *pgxpool.Pool
}

// NewStore creates a new Store
func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

// ControlLibraryItem represents a row in 'control_library'
type ControlLibraryItem struct {
	ID          string `json:"id" db:"id"`
	Standard    string `json:"standard" db:"standard"`
	Family      string `json:"family" db:"family"`
	Name        string `json:"name" db:"name"`
	Description string `json:"description" db:"description"`
}

// ActivatedControl represents a row in 'activated_controls'
type ActivatedControl struct {
	ID                 string  `json:"id" db:"id"`
	ControlLibraryID   string  `json:"control_library_id" db:"control_library_id"`
	OwnerID            string  `json:"owner_id" db:"owner_id"`
	Status             string  `json:"status" db:"status"`
	ReviewIntervalDays int     `json:"review_interval_days" db:"review_interval_days"`
	LastReviewedAt     *string `json:"last_reviewed_at,omitempty" db:"last_reviewed_at"`
	NextReviewDueDate  string  `json:"next_review_due_date" db:"next_review_due_date"`
	CreatedAt          string  `json:"created_at" db:"created_at"`
	UpdatedAt          string  `json:"updated_at" db:"updated_at"`
}

// ActivateControlRequest is the JSON for activating a new control
type ActivateControlRequest struct {
	ControlLibraryID   string `json:"control_library_id"`
	OwnerID            string `json:"owner_id"`
	ReviewIntervalDays int    `json:"review_interval_days"`
}

// ActiveControlListItem is the JOINed view for the list API
type ActiveControlListItem struct {
	ID                string         `json:"id" db:"id"`
	ControlName       string         `json:"control_name" db:"control_name"`
	ControlID         string         `json:"control_id" db:"control_id"`
	OwnerName         sql.NullString `json:"owner_name,omitempty" db:"owner_name"`
	Status            string         `json:"status" db:"status"`
	NextReviewDueDate string         `json:"next_review_due_date" db:"next_review_due_date"`
	LastReviewedAt    sql.NullString `json:"last_reviewed_at,omitempty" db:"last_reviewed_at"`
}

// ControlEvidenceLog represents a row in 'control_evidence_log'
type ControlEvidenceLog struct {
	ID                 string `json:"id" db:"id"`
	ActivatedControlID string `json:"activated_control_id" db:"activated_control_id"`
	PerformedByID      string `json:"performed_by_id" db:"performed_by_id"`
	PerformedAt        string `json:"performed_at" db:"performed_at"`
	ComplianceStatus   string `json:"compliance_status" db:"compliance_status"`
	Notes              string `json:"notes,omitempty" db:"notes"`
	EvidenceLink       string `json:"evidence_link,omitempty" db:"evidence_link"`
}

// SubmitEvidenceRequest is the JSON for submitting evidence
type SubmitEvidenceRequest struct {
	ComplianceStatus string `json:"compliance_status"`
	Notes            string `json:"notes"`
	EvidenceLink     string `json:"evidence_link,omitempty"`
}

// Ticket represents a row in 'tickets'
type Ticket struct {
	ID                  string         `json:"id" db:"id"`
	SequentialID        int32          `json:"sequential_id" db:"sequential_id"`
	TicketType          string         `json:"ticket_type" db:"ticket_type"`
	Title               string         `json:"title" db:"title"`
	Description         sql.NullString `json:"description,omitempty" db:"description"`
	Category            sql.NullString `json:"category,omitempty" db:"category"`
	Status              string         `json:"status" db:"status"`
	CreatedByUserID     sql.NullString `json:"created_by_user_id,omitempty" db:"created_by_user_id"`
	AssignedToUserID    sql.NullString `json:"assigned_to_user_id,omitempty" db:"assigned_to_user_id"`
	ExternalCustomerRef sql.NullString `json:"external_customer_ref,omitempty" db:"external_customer_ref"`
	ActivatedControlID  sql.NullString `json:"activated_control_id,omitempty" db:"activated_control_id"`
	DocumentID          sql.NullString `json:"document_id,omitempty" db:"document_id"`
	AssetID             sql.NullString `json:"asset_id,omitempty" db:"asset_id"`
	CreatedAt           string         `json:"created_at" db:"created_at"`
	UpdatedAt           string         `json:"updated_at" db:"updated_at"`
	ResolvedAt          sql.NullString `json:"resolved_at,omitempty" db:"resolved_at"`
}

// CreateInternalTicketRequest is the JSON for a new internal ticket
type CreateInternalTicketRequest struct {
	Title              string  `json:"title"`
	Description        *string `json:"description"`
	Category           *string `json:"category"`
	ActivatedControlID *string `json:"activated_control_id"`
	DocumentID         *string `json:"document_id"`
	AssetID            *string `json:"asset_id"`
}

// CreateExternalTicketRequest is the JSON for a new external ticket
type CreateExternalTicketRequest struct {
	Title               string  `json:"title"`
	Description         *string `json:"description"`
	Category            *string `json:"category"`
	ExternalCustomerRef string  `json:"external_customer_ref"`
}

// TicketComment represents a row in 'ticket_comments'
type TicketComment struct {
	ID                  string         `json:"id" db:"id"`
	TicketID            string         `json:"ticket_id" db:"ticket_id"`
	Body                string         `json:"body" db:"body"`
	IsInternalNote      bool           `json:"is_internal_note" db:"is_internal_note"`
	CommentByUserID     sql.NullString `json:"comment_by_user_id,omitempty" db:"comment_by_user_id"`
	ExternalCustomerRef sql.NullString `json:"external_customer_ref,omitempty" db:"external_customer_ref"`
	CreatedAt           string         `json:"created_at" db:"created_at"`
}

// AddCommentRequest is the JSON for adding a comment
type AddCommentRequest struct {
	Body           string `json:"body"`
	IsInternalNote *bool  `json:"is_internal_note,omitempty"` // Only for internal tickets
}

// UpdateTicketRequest is the JSON for updating a ticket
type UpdateTicketRequest struct {
	Status           *string `json:"status,omitempty"`
	AssignedToUserID *string `json:"assigned_to_user_id,omitempty"`
	Category         *string `json:"category,omitempty"`
}

// User represents a row in 'users'
type User struct {
	ID    string `json:"id" db:"id"`
	Email string `json:"email" db:"email"`
	Name  string `json:"name" db:"name"`
	Role  string `json:"role" db:"role"`
}

// LoginRequest is the JSON for login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse is the JSON response for login
type LoginResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

// Asset represents a row in 'assets'
type Asset struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	AssetType string    `json:"asset_type" db:"asset_type"`
	OwnerID   string    `json:"owner_id" db:"owner_id"`
	Status    string    `json:"status" db:"status"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// CreateAssetRequest is the JSON for creating a new asset
type CreateAssetRequest struct {
	Name      string `json:"name"`
	AssetType string `json:"asset_type"`
	OwnerID   string `json:"owner_id"`
}

// UpdateAssetRequest is the JSON for updating an asset
type UpdateAssetRequest struct {
	Name      *string `json:"name,omitempty"`
	AssetType *string `json:"asset_type,omitempty"`
	OwnerID   *string `json:"owner_id,omitempty"`
	Status    *string `json:"status,omitempty"`
}


// AssetControlMapping represents a row in 'asset_control_mappings'
type AssetControlMapping struct {
	ID                 string `json:"id" db:"id"`
	AssetID            string `json:"asset_id" db:"asset_id"`
	ActivatedControlID string `json:"activated_control_id" db:"activated_control_id"`
	MappingType        string `json:"mapping_type" db:"mapping_type"`
	CreatedAt          string `json:"created_at" db:"created_at"`
}

// DocumentControlMapping represents a row in 'document_control_mappings'
type DocumentControlMapping struct {
	ID                 string `json:"id" db:"id"`
	DocumentID         string `json:"document_id" db:"document_id"`
	ActivatedControlID string `json:"activated_control_id" db:"activated_control_id"`
	MappingType        string `json:"mapping_type" db:"mapping_type"`
	CreatedAt          string `json:"created_at" db:"created_at"`
}

// CreateMappingRequest is the JSON for creating mappings
type CreateMappingRequest struct {
	ActivatedControlID string `json:"activated_control_id"`
	MappingType        string `json:"mapping_type"`
}

// GetControlLibrary fetches all controls from the master library
func (s *Store) GetControlLibrary(ctx context.Context) ([]ControlLibraryItem, error) {
	query := `
	SELECT id, standard, family, name, description
	FROM control_library ORDER BY id;
	`
	rows, err := s.db.Query(ctx, query)
	if err != nil {
		log.Printf("Error querying control_library: %v", err)
		return nil, err
	}
	defer rows.Close()

	var controls []ControlLibraryItem
	for rows.Next() {
		var c ControlLibraryItem
		if err := rows.Scan(&c.ID, &c.Standard, &c.Family, &c.Name, &c.Description); err != nil {
			log.Printf("Error scanning control_library row: %v", err)
			return nil, err
		}
		controls = append(controls, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if controls == nil {
		controls = make([]ControlLibraryItem, 0)
	}
	return controls, nil
}

// ActivateControl inserts a new active control into the database
func (s *Store) ActivateControl(ctx context.Context, req ActivateControlRequest) (*ActivatedControl, error) {
	query := `
		INSERT INTO activated_controls
		(control_library_id, owner_id, status, review_interval_days, next_review_due_date)
		VALUES
		($1, $2, 'active', $3, CURRENT_DATE + INTERVAL '1 day' * $3)
		RETURNING id, control_library_id, owner_id, status, review_interval_days,
		 last_reviewed_at, next_review_due_date, created_at, updated_at;
	`
	var newControl ActivatedControl
	err := s.db.QueryRow(ctx, query,
		req.ControlLibraryID,
		req.OwnerID,
		req.ReviewIntervalDays,
	).Scan(
		&newControl.ID,
		&newControl.ControlLibraryID,
		&newControl.OwnerID,
		&newControl.Status,
		&newControl.ReviewIntervalDays,
		&newControl.LastReviewedAt,
		&newControl.NextReviewDueDate,
		&newControl.CreatedAt,
		&newControl.UpdatedAt,
	)
	if err != nil {
		log.Printf("Error INSERT into activated_controls: %v", err)
		return nil, err
	}
	return &newControl, nil
}

// GetActiveControlsList fetches a JOINed list of all active controls
func (s *Store) GetActiveControlsList(ctx context.Context) ([]ActiveControlListItem, error) {
	query := `
		SELECT
			ac.id, cl.name AS control_name, ac.control_library_id AS control_id,
			u.name AS owner_name, ac.status, ac.next_review_due_date::text, ac.last_reviewed_at::text
		FROM
			activated_controls ac
		LEFT JOIN
			control_library cl ON ac.control_library_id = cl.id
		LEFT JOIN
			users u ON ac.owner_id = u.id
		WHERE
			ac.status = 'active'
		ORDER BY
			ac.next_review_due_date ASC;
	`
	rows, err := s.db.Query(ctx, query)
	if err != nil {
		log.Printf("Error querying activated_controls (JOIN): %v", err)
		return nil, err
	}
	defer rows.Close()

	var controls []ActiveControlListItem
	for rows.Next() {
		var c ActiveControlListItem
		if err := rows.Scan(
			&c.ID, &c.ControlName, &c.ControlID, &c.OwnerName,
			&c.Status, &c.NextReviewDueDate, &c.LastReviewedAt,
		); err != nil {
			log.Printf("Error scanning JOINed activated_controls row: %v", err)
			return nil, err
		}
		controls = append(controls, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if controls == nil {
		controls = make([]ActiveControlListItem, 0)
	}
	return controls, nil
}

// SubmitControlEvidence runs a transaction to log evidence and update the control
func (s *Store) SubmitControlEvidence(ctx context.Context, activatedControlID string, userID string, req SubmitEvidenceRequest) (*ControlEvidenceLog, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var reviewIntervalDays int
	intervalQuery := "SELECT review_interval_days FROM activated_controls WHERE id = $1"
	err = tx.QueryRow(ctx, intervalQuery, activatedControlID).Scan(&reviewIntervalDays)
	if err != nil {
		return nil, fmt.Errorf("control with ID %s not found: %w", activatedControlID, err)
	}

	logQuery := `
		INSERT INTO control_evidence_log
		(activated_control_id, performed_by_id, compliance_status, notes, evidence_link)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, activated_control_id, performed_by_id, performed_at,
		 compliance_status, notes, evidence_link;
	`
	var newLogEntry ControlEvidenceLog
	err = tx.QueryRow(ctx, logQuery,
		activatedControlID, userID, req.ComplianceStatus, req.Notes, req.EvidenceLink,
	).Scan(
		&newLogEntry.ID, &newLogEntry.ActivatedControlID, &newLogEntry.PerformedByID,
		&newLogEntry.PerformedAt, &newLogEntry.ComplianceStatus, &newLogEntry.Notes, &newLogEntry.EvidenceLink,
	)
	if err != nil {
		log.Printf("Error INSERT into control_evidence_log: %v", err)
		return nil, err
	}

	updateQuery := `
		UPDATE activated_controls
		SET last_reviewed_at = NOW(), next_review_due_date = NOW() + INTERVAL '1 day' * $1
		WHERE id = $2;
	`
	_, err = tx.Exec(ctx, updateQuery, reviewIntervalDays, activatedControlID)
	if err != nil {
		log.Printf("Error UPDATE activated_controls: %v", err)
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &newLogEntry, nil
}

// CreateInternalTicket creates a new internal ticket
func (s *Store) CreateInternalTicket(ctx context.Context, userID string, req CreateInternalTicketRequest) (*Ticket, error) {
	query := `
		INSERT INTO tickets
		(ticket_type, created_by_user_id, status, title, description, category, activated_control_id, document_id, asset_id)
		VALUES
		('internal', $1, 'new', $2, $3, $4, $5, $6, $7)
		RETURNING
			id, sequential_id, ticket_type, title, description, category, status,
			created_by_user_id, assigned_to_user_id, external_customer_ref,
			activated_control_id, document_id, asset_id,
			created_at, updated_at, resolved_at;
	`
	var newTicket Ticket
	err := s.db.QueryRow(ctx, query,
		userID,
		req.Title, req.Description, req.Category,
		req.ActivatedControlID, req.DocumentID, req.AssetID,
	).Scan(
		&newTicket.ID, &newTicket.SequentialID, &newTicket.TicketType, &newTicket.Title,
		&newTicket.Description, &newTicket.Category, &newTicket.Status,
		&newTicket.CreatedByUserID, &newTicket.AssignedToUserID, &newTicket.ExternalCustomerRef,
		&newTicket.ActivatedControlID, &newTicket.DocumentID, &newTicket.AssetID,
		&newTicket.CreatedAt, &newTicket.UpdatedAt, &newTicket.ResolvedAt,
	)
	if err != nil {
		log.Printf("Error INSERT into tickets: %v", err)
		return nil, err
	}
	return &newTicket, nil
}

// CreateExternalTicket creates a new external ticket
func (s *Store) CreateExternalTicket(ctx context.Context, req CreateExternalTicketRequest) (*Ticket, error) {
	query := `
		INSERT INTO tickets
		(ticket_type, status, title, description, category, external_customer_ref)
		VALUES
		('external', 'new', $1, $2, $3, $4)
		RETURNING
			id, sequential_id, ticket_type, title, description, category, status,
			created_by_user_id, assigned_to_user_id, external_customer_ref,
			activated_control_id, document_id, asset_id,
			created_at, updated_at, resolved_at;
	`
	var newTicket Ticket
	err := s.db.QueryRow(ctx, query,
		req.Title, req.Description, req.Category, req.ExternalCustomerRef,
	).Scan(
		&newTicket.ID, &newTicket.SequentialID, &newTicket.TicketType, &newTicket.Title,
		&newTicket.Description, &newTicket.Category, &newTicket.Status,
		&newTicket.CreatedByUserID, &newTicket.AssignedToUserID, &newTicket.ExternalCustomerRef,
		&newTicket.ActivatedControlID, &newTicket.DocumentID, &newTicket.AssetID,
		&newTicket.CreatedAt, &newTicket.UpdatedAt, &newTicket.ResolvedAt,
	)
	if err != nil {
		log.Printf("Error INSERT into tickets: %v", err)
		return nil, err
	}
	return &newTicket, nil
}

// GetAllTickets fetches all tickets (admin only)
func (s *Store) GetAllTickets(ctx context.Context) ([]Ticket, error) {
	query := `
		SELECT id, sequential_id, ticket_type, title, description, category, status,
			created_by_user_id, assigned_to_user_id, external_customer_ref,
			activated_control_id, document_id, asset_id,
			created_at, updated_at, resolved_at
		FROM tickets ORDER BY created_at DESC;
	`
	rows, err := s.db.Query(ctx, query)
	if err != nil {
		log.Printf("Error querying all tickets: %v", err)
		return nil, err
	}
	defer rows.Close()

	var tickets []Ticket
	for rows.Next() {
		var t Ticket
		if err := rows.Scan(
			&t.ID, &t.SequentialID, &t.TicketType, &t.Title,
			&t.Description, &t.Category, &t.Status,
			&t.CreatedByUserID, &t.AssignedToUserID, &t.ExternalCustomerRef,
			&t.ActivatedControlID, &t.DocumentID, &t.AssetID,
			&t.CreatedAt, &t.UpdatedAt, &t.ResolvedAt,
		); err != nil {
			log.Printf("Error scanning ticket row: %v", err)
			return nil, err
		}
		tickets = append(tickets, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if tickets == nil {
		tickets = make([]Ticket, 0)
	}
	return tickets, nil
}

// GetTicketsByType fetches tickets by type (admin only)
func (s *Store) GetTicketsByType(ctx context.Context, ticketType string) ([]Ticket, error) {
	query := `
		SELECT id, sequential_id, ticket_type, title, description, category, status,
			created_by_user_id, assigned_to_user_id, external_customer_ref,
			activated_control_id, document_id, asset_id,
			created_at, updated_at, resolved_at
		FROM tickets WHERE ticket_type = $1 ORDER BY created_at DESC;
	`
	rows, err := s.db.Query(ctx, query, ticketType)
	if err != nil {
		log.Printf("Error querying tickets by type: %v", err)
		return nil, err
	}
	defer rows.Close()

	var tickets []Ticket
	for rows.Next() {
		var t Ticket
		if err := rows.Scan(
			&t.ID, &t.SequentialID, &t.TicketType, &t.Title,
			&t.Description, &t.Category, &t.Status,
			&t.CreatedByUserID, &t.AssignedToUserID, &t.ExternalCustomerRef,
			&t.ActivatedControlID, &t.DocumentID, &t.AssetID,
			&t.CreatedAt, &t.UpdatedAt, &t.ResolvedAt,
		); err != nil {
			log.Printf("Error scanning ticket row: %v", err)
			return nil, err
		}
		tickets = append(tickets, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if tickets == nil {
		tickets = make([]Ticket, 0)
	}
	return tickets, nil
}

// GetTicketsForUser fetches tickets for a specific user (created by or assigned to)
func (s *Store) GetTicketsForUser(ctx context.Context, userID string) ([]Ticket, error) {
	query := `
		SELECT id, sequential_id, ticket_type, title, description, category, status,
			created_by_user_id, assigned_to_user_id, external_customer_ref,
			activated_control_id, document_id, asset_id,
			created_at, updated_at, resolved_at
		FROM tickets
		WHERE created_by_user_id = $1 OR assigned_to_user_id = $1
		ORDER BY created_at DESC;
	`
	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		log.Printf("Error querying tickets for user: %v", err)
		return nil, err
	}
	defer rows.Close()

	var tickets []Ticket
	for rows.Next() {
		var t Ticket
		if err := rows.Scan(
			&t.ID, &t.SequentialID, &t.TicketType, &t.Title,
			&t.Description, &t.Category, &t.Status,
			&t.CreatedByUserID, &t.AssignedToUserID, &t.ExternalCustomerRef,
			&t.ActivatedControlID, &t.DocumentID, &t.AssetID,
			&t.CreatedAt, &t.UpdatedAt, &t.ResolvedAt,
		); err != nil {
			log.Printf("Error scanning ticket row: %v", err)
			return nil, err
		}
		tickets = append(tickets, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if tickets == nil {
		tickets = make([]Ticket, 0)
	}
	return tickets, nil
}

// GetTicketsByCustomerRef fetches tickets for a specific external customer reference
func (s *Store) GetTicketsByCustomerRef(ctx context.Context, customerRef string) ([]Ticket, error) {
	query := `
		SELECT id, sequential_id, ticket_type, title, description, category, status,
			created_by_user_id, assigned_to_user_id, external_customer_ref,
			activated_control_id, document_id, asset_id,
			created_at, updated_at, resolved_at
		FROM tickets
		WHERE external_customer_ref = $1 AND ticket_type = 'external'
		ORDER BY created_at DESC;
	`
	rows, err := s.db.Query(ctx, query, customerRef)
	if err != nil {
		log.Printf("Error querying tickets for customer ref: %v", err)
		return nil, err
	}
	defer rows.Close()

	var tickets []Ticket
	for rows.Next() {
		var t Ticket
		if err := rows.Scan(
			&t.ID, &t.SequentialID, &t.TicketType, &t.Title,
			&t.Description, &t.Category, &t.Status,
			&t.CreatedByUserID, &t.AssignedToUserID, &t.ExternalCustomerRef,
			&t.ActivatedControlID, &t.DocumentID, &t.AssetID,
			&t.CreatedAt, &t.UpdatedAt, &t.ResolvedAt,
		); err != nil {
			log.Printf("Error scanning ticket row: %v", err)
			return nil, err
		}
		tickets = append(tickets, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if tickets == nil {
		tickets = make([]Ticket, 0)
	}
	return tickets, nil
}

// GetTicketByID fetches a single ticket by ID
func (s *Store) GetTicketByID(ctx context.Context, ticketID string) (*Ticket, error) {
	query := `
		SELECT id, sequential_id, ticket_type, title, description, category, status,
			created_by_user_id, assigned_to_user_id, external_customer_ref,
			activated_control_id, document_id, asset_id,
			created_at, updated_at, resolved_at
		FROM tickets WHERE id = $1;
	`
	var ticket Ticket
	err := s.db.QueryRow(ctx, query, ticketID).Scan(
		&ticket.ID, &ticket.SequentialID, &ticket.TicketType, &ticket.Title,
		&ticket.Description, &ticket.Category, &ticket.Status,
		&ticket.CreatedByUserID, &ticket.AssignedToUserID, &ticket.ExternalCustomerRef,
		&ticket.ActivatedControlID, &ticket.DocumentID, &ticket.AssetID,
		&ticket.CreatedAt, &ticket.UpdatedAt, &ticket.ResolvedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("ticket not found")
		}
		log.Printf("Error querying ticket by ID: %v", err)
		return nil, err
	}
	return &ticket, nil
}

// GetTicketComments fetches all comments for a ticket
func (s *Store) GetTicketComments(ctx context.Context, ticketID string) ([]TicketComment, error) {
	query := `
		SELECT id, ticket_id, body, is_internal_note, comment_by_user_id, external_customer_ref, created_at
		FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC;
	`
	rows, err := s.db.Query(ctx, query, ticketID)
	if err != nil {
		log.Printf("Error querying ticket comments: %v", err)
		return nil, err
	}
	defer rows.Close()

	var comments []TicketComment
	for rows.Next() {
		var c TicketComment
		if err := rows.Scan(
			&c.ID, &c.TicketID, &c.Body, &c.IsInternalNote,
			&c.CommentByUserID, &c.ExternalCustomerRef, &c.CreatedAt,
		); err != nil {
			log.Printf("Error scanning comment row: %v", err)
			return nil, err
		}
		comments = append(comments, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if comments == nil {
		comments = make([]TicketComment, 0)
	}
	return comments, nil
}

// AddTicketComment adds a new comment to a ticket
func (s *Store) AddTicketComment(ctx context.Context, ticketID string, userID string, req AddCommentRequest) (*TicketComment, error) {
	isInternalNote := false
	if req.IsInternalNote != nil {
		isInternalNote = *req.IsInternalNote
	}

	query := `
		INSERT INTO ticket_comments
		(ticket_id, body, is_internal_note, comment_by_user_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, ticket_id, body, is_internal_note, comment_by_user_id, external_customer_ref, created_at;
	`
	var newComment TicketComment
	err := s.db.QueryRow(ctx, query,
		ticketID, req.Body, isInternalNote, userID,
	).Scan(
		&newComment.ID, &newComment.TicketID, &newComment.Body,
		&newComment.IsInternalNote, &newComment.CommentByUserID,
		&newComment.ExternalCustomerRef, &newComment.CreatedAt,
	)
	if err != nil {
		log.Printf("Error INSERT into ticket_comments: %v", err)
		return nil, err
	}
	return &newComment, nil
}

// UpdateTicket updates a ticket's status, assignment, or category
func (s *Store) UpdateTicket(ctx context.Context, ticketID string, req UpdateTicketRequest) (*Ticket, error) {
	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argCount := 1

	if req.Status != nil {
		setParts = append(setParts, fmt.Sprintf("status = $%d", argCount))
		args = append(args, *req.Status)
		argCount++
	}

	if req.AssignedToUserID != nil {
		setParts = append(setParts, fmt.Sprintf("assigned_to_user_id = $%d", argCount))
		args = append(args, *req.AssignedToUserID)
		argCount++
	}

	if req.Category != nil {
		setParts = append(setParts, fmt.Sprintf("category = $%d", argCount))
		args = append(args, *req.Category)
		argCount++
	}

	if len(setParts) == 0 {
		// No updates requested
		return s.GetTicketByID(ctx, ticketID)
	}

	setClause := strings.Join(setParts, ", ")
	query := fmt.Sprintf(`
		UPDATE tickets
		SET %s, updated_at = NOW()
		WHERE id = $%d
		RETURNING id, sequential_id, ticket_type, title, description, category, status,
			created_by_user_id, assigned_to_user_id, external_customer_ref,
			activated_control_id, document_id, asset_id,
			created_at, updated_at, resolved_at;
	`, setClause, argCount)

	args = append(args, ticketID)

	var updatedTicket Ticket
	err := s.db.QueryRow(ctx, query, args...).Scan(
		&updatedTicket.ID, &updatedTicket.SequentialID, &updatedTicket.TicketType, &updatedTicket.Title,
		&updatedTicket.Description, &updatedTicket.Category, &updatedTicket.Status,
		&updatedTicket.CreatedByUserID, &updatedTicket.AssignedToUserID, &updatedTicket.ExternalCustomerRef,
		&updatedTicket.ActivatedControlID, &updatedTicket.DocumentID, &updatedTicket.AssetID,
		&updatedTicket.CreatedAt, &updatedTicket.UpdatedAt, &updatedTicket.ResolvedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("ticket not found")
		}
		log.Printf("Error UPDATE ticket: %v", err)
		return nil, err
	}
	return &updatedTicket, nil
}

// AuthenticateUser authenticates a user by email and password
func (s *Store) AuthenticateUser(ctx context.Context, email, password string) (*User, error) {
	query := `
		SELECT id, email, name, role
		FROM users
		WHERE email = $1 AND role IN ('admin', 'user')
		LIMIT 1;
	`

	var user User
	err := s.db.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.Name, &user.Role,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invalid credentials")
		}
		log.Printf("Error authenticating user: %v", err)
		return nil, err
	}

	// For demo purposes, accept any password for seeded users
	// In production, you would hash and compare passwords properly
	if password != "admin123" && password != "user123" && password != "john123" && password != "password123" {
		return nil, fmt.Errorf("invalid credentials")
	}

	return &user, nil
}

// Asset CRUD operations
func (s *Store) CreateAsset(ctx context.Context, req CreateAssetRequest) (*Asset, error) {
	query := `
		INSERT INTO assets
		(name, asset_type, owner_id, status)
		VALUES ($1, $2, $3, 'active')
		RETURNING id, name, asset_type, owner_id, status, created_at, updated_at;
	`
	var asset Asset
	err := s.db.QueryRow(ctx, query,
		req.Name, req.AssetType, req.OwnerID,
	).Scan(
		&asset.ID, &asset.Name, &asset.AssetType,
		&asset.OwnerID, &asset.Status, &asset.CreatedAt, &asset.UpdatedAt,
	)
	if err != nil {
		log.Printf("Error INSERT into assets: %v", err)
		return nil, err
	}
	return &asset, nil
}

func (s *Store) GetAssets(ctx context.Context) ([]Asset, error) {
	query := `
		SELECT id, name, asset_type, owner_id, status, created_at, updated_at
		FROM assets ORDER BY created_at DESC;
	`
	rows, err := s.db.Query(ctx, query)
	if err != nil {
		log.Printf("Error querying assets: %v", err)
		return nil, err
	}
	defer rows.Close()

	var assets []Asset
	for rows.Next() {
		var asset Asset
		if err := rows.Scan(
			&asset.ID, &asset.Name, &asset.AssetType,
			&asset.OwnerID, &asset.Status, &asset.CreatedAt, &asset.UpdatedAt,
		); err != nil {
			log.Printf("Error scanning asset row: %v", err)
			return nil, err
		}
		assets = append(assets, asset)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if assets == nil {
		assets = make([]Asset, 0)
	}
	return assets, nil
}

func (s *Store) GetAssetByID(ctx context.Context, assetID string) (*Asset, error) {
	query := `
		SELECT id, name, asset_type, owner_id, status, created_at, updated_at
		FROM assets WHERE id = $1;
	`
	var asset Asset
	err := s.db.QueryRow(ctx, query, assetID).Scan(
		&asset.ID, &asset.Name, &asset.AssetType,
		&asset.OwnerID, &asset.Status, &asset.CreatedAt, &asset.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("asset not found")
		}
		log.Printf("Error querying asset by ID: %v", err)
		return nil, err
	}
	return &asset, nil
}

func (s *Store) UpdateAsset(ctx context.Context, assetID string, req UpdateAssetRequest) (*Asset, error) {
	setParts := []string{}
	args := []interface{}{}
	argCount := 1

	if req.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *req.Name)
		argCount++
	}
	if req.AssetType != nil {
		setParts = append(setParts, fmt.Sprintf("asset_type = $%d", argCount))
		args = append(args, *req.AssetType)
		argCount++
	}
	if req.OwnerID != nil {
		setParts = append(setParts, fmt.Sprintf("owner_id = $%d", argCount))
		args = append(args, *req.OwnerID)
		argCount++
	}
	if req.Status != nil {
		setParts = append(setParts, fmt.Sprintf("status = $%d", argCount))
		args = append(args, *req.Status)
		argCount++
	}

	if len(setParts) == 0 {
		return s.GetAssetByID(ctx, assetID)
	}

	setClause := strings.Join(setParts, ", ")
	query := fmt.Sprintf(`
		UPDATE assets
		SET %s, updated_at = NOW()
		WHERE id = $%d
		RETURNING id, name, asset_type, owner_id, status, created_at, updated_at;
	`, setClause, argCount)

	args = append(args, assetID)

	var asset Asset
	err := s.db.QueryRow(ctx, query, args...).Scan(
		&asset.ID, &asset.Name, &asset.AssetType,
		&asset.OwnerID, &asset.Status, &asset.CreatedAt, &asset.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("asset not found")
		}
		log.Printf("Error UPDATE asset: %v", err)
		return nil, err
	}
	return &asset, nil
}

func (s *Store) DeleteAsset(ctx context.Context, assetID string) error {
	query := `DELETE FROM assets WHERE id = $1;`
	result, err := s.db.Exec(ctx, query, assetID)
	if err != nil {
		log.Printf("Error DELETE asset: %v", err)
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("asset not found")
	}
	return nil
}

// AuditLog represents a row in 'audit_log'
type AuditLog struct {
	ID               string  `json:"id" db:"id"`
	PerformedAt      string  `json:"performed_at" db:"performed_at"`
	UserID           *string `json:"user_id,omitempty" db:"user_id"`
	ActionType       string  `json:"action_type" db:"action_type"`
	TargetEntityType *string `json:"target_entity_type,omitempty" db:"target_entity_type"`
	TargetEntityID   *string `json:"target_entity_id,omitempty" db:"target_entity_id"`
	Changes          *string `json:"changes,omitempty" db:"changes"`
	IPAddress        *string `json:"ip_address,omitempty" db:"ip_address"`
}

// LogAudit logs an audit event
func (s *Store) LogAudit(ctx context.Context, userID *string, actionType string, targetEntityType *string, targetEntityID *string, changes interface{}, ipAddress *string) error {
	var changesJSON *string
	if changes != nil {
		changesBytes, err := json.Marshal(changes)
		if err != nil {
			log.Printf("Error marshaling changes to JSON: %v", err)
			return err
		}
		changesStr := string(changesBytes)
		changesJSON = &changesStr
	}

	query := `
		INSERT INTO audit_log
		(user_id, action_type, target_entity_type, target_entity_id, changes, ip_address)
		VALUES ($1, $2, $3, $4, $5, $6);
	`

	_, err := s.db.Exec(ctx, query, userID, actionType, targetEntityType, targetEntityID, changesJSON, ipAddress)
	if err != nil {
		log.Printf("Error INSERT into audit_log: %v", err)
		return err
	}
	return nil
}

// GetAuditLogs retrieves audit logs with optional filtering
func (s *Store) GetAuditLogs(ctx context.Context, limit int, offset int, userID *string, actionType *string, entityType *string) ([]AuditLog, error) {
	query := `
		SELECT id, performed_at, user_id, action_type, target_entity_type, target_entity_id, changes, ip_address
		FROM audit_log
		WHERE ($1::uuid IS NULL OR user_id = $1)
		AND ($2::text IS NULL OR action_type = $2)
		AND ($3::text IS NULL OR target_entity_type = $3)
		ORDER BY performed_at DESC
		LIMIT $4 OFFSET $5;
	`

	rows, err := s.db.Query(ctx, query, userID, actionType, entityType, limit, offset)
	if err != nil {
		log.Printf("Error querying audit logs: %v", err)
		return nil, err
	}
	defer rows.Close()

	var logs []AuditLog
	for rows.Next() {
		var auditLog AuditLog
		if err := rows.Scan(
			&auditLog.ID, &auditLog.PerformedAt, &auditLog.UserID, &auditLog.ActionType,
			&auditLog.TargetEntityType, &auditLog.TargetEntityID, &auditLog.Changes, &auditLog.IPAddress,
		); err != nil {
			log.Printf("Error scanning audit log row: %v", err)
			return nil, err
		}
		logs = append(logs, auditLog)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if logs == nil {
		logs = make([]AuditLog, 0)
	}
	return logs, nil
}

// Notification represents a row in 'notifications'
type Notification struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Message   string    `json:"message" db:"message"`
	LinkURL   string    `json:"link_url,omitempty" db:"link_url"`
	IsRead    bool      `json:"is_read" db:"is_read"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// CreateNotification creates a new notification
func (s *Store) CreateNotification(ctx context.Context, userID string, message string, linkURL string) error {
	query := `
		INSERT INTO notifications
		(user_id, message, link_url)
		VALUES ($1, $2, $3);
	`

	_, err := s.db.Exec(ctx, query, userID, message, linkURL)
	if err != nil {
		log.Printf("Error INSERT into notifications: %v", err)
		return err
	}
	return nil
}

// GetNotificationsForUser retrieves notifications for a specific user
func (s *Store) GetNotificationsForUser(ctx context.Context, userID string, onlyUnread bool) ([]Notification, error) {
	var query string
	if onlyUnread {
		query = `
			SELECT id, user_id, message, link_url, is_read, created_at
			FROM notifications
			WHERE user_id = $1 AND is_read = false
			ORDER BY created_at DESC;
		`
	} else {
		query = `
			SELECT id, user_id, message, link_url, is_read, created_at
			FROM notifications
			WHERE user_id = $1
			ORDER BY created_at DESC;
		`
	}

	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		log.Printf("Error querying notifications: %v", err)
		return nil, err
	}
	defer rows.Close()

	var notifications []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(
			&n.ID, &n.UserID, &n.Message, &n.LinkURL, &n.IsRead, &n.CreatedAt,
		); err != nil {
			log.Printf("Error scanning notification row: %v", err)
			return nil, err
		}
		notifications = append(notifications, n)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if notifications == nil {
		notifications = make([]Notification, 0)
	}
	return notifications, nil
}

// MarkNotificationAsRead marks a notification as read
func (s *Store) MarkNotificationAsRead(ctx context.Context, notificationID string, userID string) error {
	query := `
		UPDATE notifications
		SET is_read = true
		WHERE id = $1 AND user_id = $2;
	`

	result, err := s.db.Exec(ctx, query, notificationID, userID)
	if err != nil {
		log.Printf("Error UPDATE notification: %v", err)
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("notification not found or not owned by user")
	}
	return nil
}

// GetDashboardSummary provides comprehensive dashboard statistics
func (s *Store) GetDashboardSummary(ctx context.Context) (map[string]interface{}, error) {
	// Get control statistics
	controlStats := make(map[string]interface{})

	// Total controls in library
	var totalControls int
	err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM control_library").Scan(&totalControls)
	if err != nil {
		return nil, fmt.Errorf("error counting total controls: %w", err)
	}
	controlStats["totalControls"] = totalControls

	// Activated controls
	var activatedControls int
	err = s.db.QueryRow(ctx, "SELECT COUNT(*) FROM activated_controls WHERE status = 'active'").Scan(&activatedControls)
	if err != nil {
		return nil, fmt.Errorf("error counting activated controls: %w", err)
	}
	controlStats["activatedControls"] = activatedControls

	// Compliant controls (last evidence was compliant)
	var compliantControls int
	err = s.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT ac.id)
		FROM activated_controls ac
		WHERE ac.status = 'active'
		AND EXISTS (
			SELECT 1 FROM control_evidence_log cel
			WHERE cel.activated_control_id = ac.id
			AND cel.compliance_status = 'compliant'
			AND cel.performed_at = (
				SELECT MAX(performed_at)
				FROM control_evidence_log
				WHERE activated_control_id = ac.id
			)
		)
	`).Scan(&compliantControls)
	if err != nil {
		return nil, fmt.Errorf("error counting compliant controls: %w", err)
	}
	controlStats["compliantControls"] = compliantControls

	// Non-compliant controls
	var nonCompliantControls int
	err = s.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT ac.id)
		FROM activated_controls ac
		WHERE ac.status = 'active'
		AND EXISTS (
			SELECT 1 FROM control_evidence_log cel
			WHERE cel.activated_control_id = ac.id
			AND cel.compliance_status = 'non-compliant'
			AND cel.performed_at = (
				SELECT MAX(performed_at)
				FROM control_evidence_log
				WHERE activated_control_id = ac.id
			)
		)
	`).Scan(&nonCompliantControls)
	if err != nil {
		return nil, fmt.Errorf("error counting non-compliant controls: %w", err)
	}
	controlStats["nonCompliantControls"] = nonCompliantControls

	// Overdue controls
	var overdueControls int
	err = s.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM activated_controls
		WHERE status = 'active'
		AND next_review_due_date < CURRENT_DATE
	`).Scan(&overdueControls)
	if err != nil {
		return nil, fmt.Errorf("error counting overdue controls: %w", err)
	}
	controlStats["overdueControls"] = overdueControls

	// Get ticket statistics
	ticketStats := make(map[string]interface{})

	// Total tickets
	var totalTickets int
	err = s.db.QueryRow(ctx, "SELECT COUNT(*) FROM tickets").Scan(&totalTickets)
	if err != nil {
		return nil, fmt.Errorf("error counting total tickets: %w", err)
	}
	ticketStats["totalTickets"] = totalTickets

	// Open tickets
	var openTickets int
	err = s.db.QueryRow(ctx, "SELECT COUNT(*) FROM tickets WHERE status IN ('new', 'in_progress')").Scan(&openTickets)
	if err != nil {
		return nil, fmt.Errorf("error counting open tickets: %w", err)
	}
	ticketStats["openTickets"] = openTickets

	// Resolved tickets this month
	var resolvedThisMonth int
	err = s.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM tickets
		WHERE status = 'resolved'
		AND resolved_at >= DATE_TRUNC('month', CURRENT_DATE)
	`).Scan(&resolvedThisMonth)
	if err != nil {
		return nil, fmt.Errorf("error counting resolved tickets this month: %w", err)
	}
	ticketStats["resolvedThisMonth"] = resolvedThisMonth

	// Get asset and document statistics
	var totalAssets int
	err = s.db.QueryRow(ctx, "SELECT COUNT(*) FROM assets WHERE status = 'active'").Scan(&totalAssets)
	if err != nil {
		return nil, fmt.Errorf("error counting assets: %w", err)
	}

	var totalDocuments int
	err = s.db.QueryRow(ctx, "SELECT COUNT(*) FROM documents").Scan(&totalDocuments)
	if err != nil {
		return nil, fmt.Errorf("error counting documents: %w", err)
	}

	// Calculate compliance percentage
	compliancePercentage := 0.0
	if activatedControls > 0 {
		compliancePercentage = float64(compliantControls) / float64(activatedControls) * 100
	}

	return map[string]interface{}{
		"controls": map[string]interface{}{
			"total":                totalControls,
			"activated":            activatedControls,
			"compliant":            compliantControls,
			"nonCompliant":         nonCompliantControls,
			"overdue":              overdueControls,
			"compliancePercentage": compliancePercentage,
		},
		"tickets": ticketStats,
		"assets": map[string]interface{}{
			"total": totalAssets,
		},
		"documents": map[string]interface{}{
			"total": totalDocuments,
		},
	}, nil
}

// ========== DOCUMENT MANAGEMENT ==========

// DocumentInfo represents a document with its basic info
type DocumentInfo struct {
	ID                 string         `json:"id"`
	Title              string         `json:"title"`
	Category           string         `json:"category"`
	OwnerID            sql.NullString `json:"owner_id,omitempty"`
	PublishedVersionID sql.NullString `json:"published_version_id,omitempty"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
}

// DocumentVersion represents a version of a document
type DocumentVersion struct {
	ID                string    `json:"id"`
	DocumentID        string    `json:"document_id"`
	VersionNumber     int       `json:"version_number"`
	BodyContent       string    `json:"body_content"`
	ChangeDescription string    `json:"change_description,omitempty"`
	Status            string    `json:"status"`
	CreatedByUserID   string    `json:"created_by_user_id"`
	CreatedAt         time.Time `json:"created_at"`
}

// CreateDocumentRequest is the JSON for creating a document
type CreateDocumentRequest struct {
	Title    string `json:"title"`
	Category string `json:"category"`
	OwnerID  string `json:"owner_id"`
}

// CreateDocumentVersionRequest is the JSON for creating a document version
type CreateDocumentVersionRequest struct {
	BodyContent       string `json:"body_content"`
	ChangeDescription string `json:"change_description,omitempty"`
}

// CreateDocument creates a new document
func (s *Store) CreateDocument(ctx context.Context, title, category, ownerID string) (*DocumentInfo, error) {
	var doc DocumentInfo
	err := s.db.QueryRow(ctx, `
		INSERT INTO documents (title, category, owner_id)
		VALUES ($1, $2, $3)
		RETURNING id, title, category, owner_id, published_version_id, created_at, updated_at
	`, title, category, ownerID).Scan(
		&doc.ID, &doc.Title, &doc.Category, &doc.OwnerID, &doc.PublishedVersionID,
		&doc.CreatedAt, &doc.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error creating document: %w", err)
	}
	return &doc, nil
}

// GetDocuments retrieves all documents
func (s *Store) GetDocuments(ctx context.Context) ([]DocumentInfo, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, title, category, owner_id, published_version_id, created_at, updated_at
		FROM documents
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("error querying documents: %w", err)
	}
	defer rows.Close()

	var documents []DocumentInfo
	for rows.Next() {
		var doc DocumentInfo
		if err := rows.Scan(&doc.ID, &doc.Title, &doc.Category, &doc.OwnerID,
			&doc.PublishedVersionID, &doc.CreatedAt, &doc.UpdatedAt); err != nil {
			return nil, fmt.Errorf("error scanning document: %w", err)
		}
		documents = append(documents, doc)
	}
	return documents, nil
}

// GetDocumentByID retrieves a single document by ID
func (s *Store) GetDocumentByID(ctx context.Context, documentID string) (*DocumentInfo, error) {
	var doc DocumentInfo
	err := s.db.QueryRow(ctx, `
		SELECT id, title, category, owner_id, published_version_id, created_at, updated_at
		FROM documents
		WHERE id = $1
	`, documentID).Scan(
		&doc.ID, &doc.Title, &doc.Category, &doc.OwnerID, &doc.PublishedVersionID,
		&doc.CreatedAt, &doc.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error getting document: %w", err)
	}
	return &doc, nil
}

// CreateDocumentVersion creates a new draft version of a document
func (s *Store) CreateDocumentVersion(ctx context.Context, documentID, bodyContent, changeDescription, userID string) (*DocumentVersion, error) {
	// Get the next version number
	var nextVersion int
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(MAX(version_number), 0) + 1
		FROM document_versions
		WHERE document_id = $1
	`, documentID).Scan(&nextVersion)
	if err != nil {
		return nil, fmt.Errorf("error getting next version number: %w", err)
	}

	// Create the new version
	var version DocumentVersion
	err = s.db.QueryRow(ctx, `
		INSERT INTO document_versions (document_id, version_number, body_content, change_description, status, created_by_user_id)
		VALUES ($1, $2, $3, $4, 'draft', $5)
		RETURNING id, document_id, version_number, body_content, change_description, status, created_by_user_id, created_at
	`, documentID, nextVersion, bodyContent, changeDescription, userID).Scan(
		&version.ID, &version.DocumentID, &version.VersionNumber, &version.BodyContent,
		&version.ChangeDescription, &version.Status, &version.CreatedByUserID, &version.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error creating document version: %w", err)
	}
	return &version, nil
}

// PublishDocumentVersion publishes a draft version
func (s *Store) PublishDocumentVersion(ctx context.Context, versionID, documentID string) error {
	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("error starting transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Archive any currently published versions
	_, err = tx.Exec(ctx, `
		UPDATE document_versions
		SET status = 'archived'
		WHERE document_id = $1 AND status = 'published'
	`, documentID)
	if err != nil {
		return fmt.Errorf("error archiving old versions: %w", err)
	}

	// Set the new version as published
	_, err = tx.Exec(ctx, `
		UPDATE document_versions
		SET status = 'published'
		WHERE id = $1
	`, versionID)
	if err != nil {
		return fmt.Errorf("error publishing version: %w", err)
	}

	// Update the document's published_version_id
	_, err = tx.Exec(ctx, `
		UPDATE documents
		SET published_version_id = $1
		WHERE id = $2
	`, versionID, documentID)
	if err != nil {
		return fmt.Errorf("error updating document published version: %w", err)
	}

	return tx.Commit(ctx)
}

// GetDocumentVersions retrieves all versions of a document
func (s *Store) GetDocumentVersions(ctx context.Context, documentID string) ([]DocumentVersion, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, document_id, version_number, body_content, change_description, status, created_by_user_id, created_at
		FROM document_versions
		WHERE document_id = $1
		ORDER BY version_number DESC
	`, documentID)
	if err != nil {
		return nil, fmt.Errorf("error querying document versions: %w", err)
	}
	defer rows.Close()

	var versions []DocumentVersion
	for rows.Next() {
		var version DocumentVersion
		if err := rows.Scan(&version.ID, &version.DocumentID, &version.VersionNumber,
			&version.BodyContent, &version.ChangeDescription, &version.Status,
			&version.CreatedByUserID, &version.CreatedAt); err != nil {
			return nil, fmt.Errorf("error scanning version: %w", err)
		}
		versions = append(versions, version)
	}
	return versions, nil
}

// AcknowledgeDocument records that a user has read a specific version
func (s *Store) AcknowledgeDocument(ctx context.Context, versionID, userID string) error {
	_, err := s.db.Exec(ctx, `
		INSERT INTO document_read_acknowledgements (document_version_id, user_id)
		VALUES ($1, $2)
		ON CONFLICT (document_version_id, user_id) DO NOTHING
	`, versionID, userID)
	if err != nil {
		return fmt.Errorf("error acknowledging document: %w", err)
	}
	return nil
}

// CreateDocumentControlMapping links a document to a control
func (s *Store) CreateDocumentControlMapping(ctx context.Context, documentID, activatedControlID string) error {
	_, err := s.db.Exec(ctx, `
		INSERT INTO document_control_mapping (document_id, activated_control_id)
		VALUES ($1, $2)
		ON CONFLICT (document_id, activated_control_id) DO NOTHING
	`, documentID, activatedControlID)
	if err != nil {
		return fmt.Errorf("error creating document-control mapping: %w", err)
	}
	return nil
}

// DeleteDocumentControlMapping removes a document-control mapping
func (s *Store) DeleteDocumentControlMapping(ctx context.Context, documentID, activatedControlID string) error {
	result, err := s.db.Exec(ctx, `
		DELETE FROM document_control_mapping
		WHERE document_id = $1 AND activated_control_id = $2
	`, documentID, activatedControlID)
	if err != nil {
		return fmt.Errorf("error deleting document-control mapping: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("mapping not found")
	}
	return nil
}

// ========== GDPR ROPA MANAGEMENT ==========

// GDPRROPA represents a Record of Processing Activities
type GDPRROPA struct {
	ID                     string    `json:"id"`
	ActivityName           string    `json:"activity_name"`
	Department             string    `json:"department,omitempty"`
	DataControllerDetails  string    `json:"data_controller_details"`
	DataCategories         string    `json:"data_categories"`
	DataSubjectCategories  string    `json:"data_subject_categories"`
	Recipients             string    `json:"recipients,omitempty"`
	ThirdCountryTransfers  string    `json:"third_country_transfers,omitempty"`
	RetentionPeriod        string    `json:"retention_period,omitempty"`
	SecurityMeasures       string    `json:"security_measures,omitempty"`
	Status                 string    `json:"status"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

// CreateROPARequest is the JSON for creating a ROPA entry
type CreateROPARequest struct {
	ActivityName          string `json:"activity_name"`
	Department            string `json:"department,omitempty"`
	DataControllerDetails string `json:"data_controller_details"`
	DataCategories        string `json:"data_categories"`
	DataSubjectCategories string `json:"data_subject_categories"`
	Recipients            string `json:"recipients,omitempty"`
	ThirdCountryTransfers string `json:"third_country_transfers,omitempty"`
	RetentionPeriod       string `json:"retention_period,omitempty"`
	SecurityMeasures      string `json:"security_measures,omitempty"`
}

// UpdateROPARequest is the JSON for updating a ROPA entry
type UpdateROPARequest struct {
	ActivityName          *string `json:"activity_name,omitempty"`
	Department            *string `json:"department,omitempty"`
	DataControllerDetails *string `json:"data_controller_details,omitempty"`
	DataCategories        *string `json:"data_categories,omitempty"`
	DataSubjectCategories *string `json:"data_subject_categories,omitempty"`
	Recipients            *string `json:"recipients,omitempty"`
	ThirdCountryTransfers *string `json:"third_country_transfers,omitempty"`
	RetentionPeriod       *string `json:"retention_period,omitempty"`
	SecurityMeasures      *string `json:"security_measures,omitempty"`
	Status                *string `json:"status,omitempty"`
}

// CreateROPA creates a new ROPA entry
func (s *Store) CreateROPA(ctx context.Context, req CreateROPARequest) (*GDPRROPA, error) {
	var ropa GDPRROPA
	err := s.db.QueryRow(ctx, `
		INSERT INTO gdpr_ropa (
			activity_name, department, data_controller_details, data_categories,
			data_subject_categories, recipients, third_country_transfers,
			retention_period, security_measures, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
		RETURNING id, activity_name, department, data_controller_details, data_categories,
			data_subject_categories, recipients, third_country_transfers, retention_period,
			security_measures, status, created_at, updated_at
	`, req.ActivityName, req.Department, req.DataControllerDetails, req.DataCategories,
		req.DataSubjectCategories, req.Recipients, req.ThirdCountryTransfers,
		req.RetentionPeriod, req.SecurityMeasures).Scan(
		&ropa.ID, &ropa.ActivityName, &ropa.Department, &ropa.DataControllerDetails,
		&ropa.DataCategories, &ropa.DataSubjectCategories, &ropa.Recipients,
		&ropa.ThirdCountryTransfers, &ropa.RetentionPeriod, &ropa.SecurityMeasures,
		&ropa.Status, &ropa.CreatedAt, &ropa.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error creating ROPA: %w", err)
	}
	return &ropa, nil
}

// GetROPAs retrieves all ROPA entries
func (s *Store) GetROPAs(ctx context.Context) ([]GDPRROPA, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, activity_name, department, data_controller_details, data_categories,
			data_subject_categories, recipients, third_country_transfers, retention_period,
			security_measures, status, created_at, updated_at
		FROM gdpr_ropa
		WHERE status != 'archived'
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("error querying ROPAs: %w", err)
	}
	defer rows.Close()

	var ropas []GDPRROPA
	for rows.Next() {
		var ropa GDPRROPA
		if err := rows.Scan(&ropa.ID, &ropa.ActivityName, &ropa.Department,
			&ropa.DataControllerDetails, &ropa.DataCategories, &ropa.DataSubjectCategories,
			&ropa.Recipients, &ropa.ThirdCountryTransfers, &ropa.RetentionPeriod,
			&ropa.SecurityMeasures, &ropa.Status, &ropa.CreatedAt, &ropa.UpdatedAt); err != nil {
			return nil, fmt.Errorf("error scanning ROPA: %w", err)
		}
		ropas = append(ropas, ropa)
	}
	return ropas, nil
}

// GetROPAByID retrieves a single ROPA entry by ID
func (s *Store) GetROPAByID(ctx context.Context, ropaID string) (*GDPRROPA, error) {
	var ropa GDPRROPA
	err := s.db.QueryRow(ctx, `
		SELECT id, activity_name, department, data_controller_details, data_categories,
			data_subject_categories, recipients, third_country_transfers, retention_period,
			security_measures, status, created_at, updated_at
		FROM gdpr_ropa
		WHERE id = $1
	`, ropaID).Scan(
		&ropa.ID, &ropa.ActivityName, &ropa.Department, &ropa.DataControllerDetails,
		&ropa.DataCategories, &ropa.DataSubjectCategories, &ropa.Recipients,
		&ropa.ThirdCountryTransfers, &ropa.RetentionPeriod, &ropa.SecurityMeasures,
		&ropa.Status, &ropa.CreatedAt, &ropa.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error getting ROPA: %w", err)
	}
	return &ropa, nil
}

// UpdateROPA updates a ROPA entry
func (s *Store) UpdateROPA(ctx context.Context, ropaID string, req UpdateROPARequest) (*GDPRROPA, error) {
	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.ActivityName != nil {
		updates = append(updates, fmt.Sprintf("activity_name = $%d", argPos))
		args = append(args, *req.ActivityName)
		argPos++
	}
	if req.Department != nil {
		updates = append(updates, fmt.Sprintf("department = $%d", argPos))
		args = append(args, *req.Department)
		argPos++
	}
	if req.DataControllerDetails != nil {
		updates = append(updates, fmt.Sprintf("data_controller_details = $%d", argPos))
		args = append(args, *req.DataControllerDetails)
		argPos++
	}
	if req.DataCategories != nil {
		updates = append(updates, fmt.Sprintf("data_categories = $%d", argPos))
		args = append(args, *req.DataCategories)
		argPos++
	}
	if req.DataSubjectCategories != nil {
		updates = append(updates, fmt.Sprintf("data_subject_categories = $%d", argPos))
		args = append(args, *req.DataSubjectCategories)
		argPos++
	}
	if req.Recipients != nil {
		updates = append(updates, fmt.Sprintf("recipients = $%d", argPos))
		args = append(args, *req.Recipients)
		argPos++
	}
	if req.ThirdCountryTransfers != nil {
		updates = append(updates, fmt.Sprintf("third_country_transfers = $%d", argPos))
		args = append(args, *req.ThirdCountryTransfers)
		argPos++
	}
	if req.RetentionPeriod != nil {
		updates = append(updates, fmt.Sprintf("retention_period = $%d", argPos))
		args = append(args, *req.RetentionPeriod)
		argPos++
	}
	if req.SecurityMeasures != nil {
		updates = append(updates, fmt.Sprintf("security_measures = $%d", argPos))
		args = append(args, *req.SecurityMeasures)
		argPos++
	}
	if req.Status != nil {
		updates = append(updates, fmt.Sprintf("status = $%d", argPos))
		args = append(args, *req.Status)
		argPos++
	}

	if len(updates) == 0 {
		return s.GetROPAByID(ctx, ropaID)
	}

	args = append(args, ropaID)
	query := fmt.Sprintf(`
		UPDATE gdpr_ropa
		SET %s
		WHERE id = $%d
		RETURNING id, activity_name, department, data_controller_details, data_categories,
			data_subject_categories, recipients, third_country_transfers, retention_period,
			security_measures, status, created_at, updated_at
	`, strings.Join(updates, ", "), argPos)

	var ropa GDPRROPA
	err := s.db.QueryRow(ctx, query, args...).Scan(
		&ropa.ID, &ropa.ActivityName, &ropa.Department, &ropa.DataControllerDetails,
		&ropa.DataCategories, &ropa.DataSubjectCategories, &ropa.Recipients,
		&ropa.ThirdCountryTransfers, &ropa.RetentionPeriod, &ropa.SecurityMeasures,
		&ropa.Status, &ropa.CreatedAt, &ropa.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error updating ROPA: %w", err)
	}
	return &ropa, nil
}

// ArchiveROPA soft-deletes a ROPA entry by setting status to 'archived'
func (s *Store) ArchiveROPA(ctx context.Context, ropaID string) error {
	_, err := s.db.Exec(ctx, `
		UPDATE gdpr_ropa
		SET status = 'archived'
		WHERE id = $1
	`, ropaID)
	if err != nil {
		return fmt.Errorf("error archiving ROPA: %w", err)
	}
	return nil
}

// MappedControl represents a control mapped to an asset or risk
type MappedControl struct {
	ActivatedControlID string     `json:"activated_control_id"`
	ControlLibraryID   string     `json:"control_library_id"`
	ControlName        string     `json:"control_name"`
	Status             string     `json:"status"`
	NextReviewDueDate  *time.Time `json:"next_review_due_date,omitempty"`
}

// Risk Assessment CRUD operations

// RiskAssessment represents a risk assessment record
type RiskAssessment struct {
	ID                 string     `json:"id"`
	Title              string     `json:"title"`
	Description        string     `json:"description"`
	Category           *string    `json:"category"`
	Likelihood         int        `json:"likelihood"`         // 1-5
	Impact             int        `json:"impact"`             // 1-5
	RiskScore          int        `json:"risk_score"`         // Calculated: likelihood * impact
	Status             string     `json:"status"`             // identified, assessed, mitigated, accepted, closed
	OwnerID            *string    `json:"owner_id"`
	MitigationPlan     *string    `json:"mitigation_plan"`
	ResidualLikelihood *int       `json:"residual_likelihood"` // After mitigation
	ResidualImpact     *int       `json:"residual_impact"`     // After mitigation
	ResidualRiskScore  int        `json:"residual_risk_score"`  // Calculated
	ReviewDate         *time.Time `json:"review_date"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// CreateRiskRequest represents the request body for creating a risk
type CreateRiskRequest struct {
	Title              string     `json:"title"`
	Description        string     `json:"description"`
	Category           *string    `json:"category"`
	Likelihood         int        `json:"likelihood"`
	Impact             int        `json:"impact"`
	OwnerID            *string    `json:"owner_id"`
	MitigationPlan     *string    `json:"mitigation_plan"`
	ResidualLikelihood *int       `json:"residual_likelihood"`
	ResidualImpact     *int       `json:"residual_impact"`
	ReviewDate         *time.Time `json:"review_date"`
}

// UpdateRiskRequest represents the request body for updating a risk
type UpdateRiskRequest struct {
	Title              *string    `json:"title"`
	Description        *string    `json:"description"`
	Category           *string    `json:"category"`
	Likelihood         *int       `json:"likelihood"`
	Impact             *int       `json:"impact"`
	Status             *string    `json:"status"`
	OwnerID            *string    `json:"owner_id"`
	MitigationPlan     *string    `json:"mitigation_plan"`
	ResidualLikelihood *int       `json:"residual_likelihood"`
	ResidualImpact     *int       `json:"residual_impact"`
	ReviewDate         *time.Time `json:"review_date"`
}

// CreateRisk creates a new risk assessment
func (s *Store) CreateRisk(ctx context.Context, req CreateRiskRequest) (*RiskAssessment, error) {
	query := `
		INSERT INTO risk_assessments
		(title, description, category, likelihood, impact, owner_id, mitigation_plan,
		 residual_likelihood, residual_impact, review_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, title, description, category, likelihood, impact, risk_score, status,
			owner_id, mitigation_plan, residual_likelihood, residual_impact, residual_risk_score,
			review_date, created_at, updated_at
	`
	var risk RiskAssessment
	err := s.db.QueryRow(ctx, query,
		req.Title, req.Description, req.Category, req.Likelihood, req.Impact,
		req.OwnerID, req.MitigationPlan, req.ResidualLikelihood, req.ResidualImpact, req.ReviewDate,
	).Scan(
		&risk.ID, &risk.Title, &risk.Description, &risk.Category, &risk.Likelihood, &risk.Impact,
		&risk.RiskScore, &risk.Status, &risk.OwnerID, &risk.MitigationPlan,
		&risk.ResidualLikelihood, &risk.ResidualImpact, &risk.ResidualRiskScore,
		&risk.ReviewDate, &risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		log.Printf("Error creating risk: %v", err)
		return nil, fmt.Errorf("error creating risk: %w", err)
	}
	return &risk, nil
}

// GetRisks retrieves all risk assessments
func (s *Store) GetRisks(ctx context.Context) ([]RiskAssessment, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, title, description, category, likelihood, impact, risk_score, status,
			owner_id, mitigation_plan, residual_likelihood, residual_impact, residual_risk_score,
			review_date, created_at, updated_at
		FROM risk_assessments
		WHERE status != 'closed'
		ORDER BY risk_score DESC, created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("error querying risks: %w", err)
	}
	defer rows.Close()

	var risks []RiskAssessment
	for rows.Next() {
		var risk RiskAssessment
		if err := rows.Scan(&risk.ID, &risk.Title, &risk.Description, &risk.Category,
			&risk.Likelihood, &risk.Impact, &risk.RiskScore, &risk.Status, &risk.OwnerID,
			&risk.MitigationPlan, &risk.ResidualLikelihood, &risk.ResidualImpact,
			&risk.ResidualRiskScore, &risk.ReviewDate, &risk.CreatedAt, &risk.UpdatedAt); err != nil {
			return nil, fmt.Errorf("error scanning risk: %w", err)
		}
		risks = append(risks, risk)
	}
	return risks, nil
}

// GetRiskByID retrieves a single risk assessment by ID
func (s *Store) GetRiskByID(ctx context.Context, riskID string) (*RiskAssessment, error) {
	var risk RiskAssessment
	err := s.db.QueryRow(ctx, `
		SELECT id, title, description, category, likelihood, impact, risk_score, status,
			owner_id, mitigation_plan, residual_likelihood, residual_impact, residual_risk_score,
			review_date, created_at, updated_at
		FROM risk_assessments
		WHERE id = $1
	`, riskID).Scan(
		&risk.ID, &risk.Title, &risk.Description, &risk.Category, &risk.Likelihood, &risk.Impact,
		&risk.RiskScore, &risk.Status, &risk.OwnerID, &risk.MitigationPlan,
		&risk.ResidualLikelihood, &risk.ResidualImpact, &risk.ResidualRiskScore,
		&risk.ReviewDate, &risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error getting risk: %w", err)
	}
	return &risk, nil
}

// UpdateRisk updates a risk assessment
func (s *Store) UpdateRisk(ctx context.Context, riskID string, req UpdateRiskRequest) (*RiskAssessment, error) {
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.Title != nil {
		updates = append(updates, fmt.Sprintf("title = $%d", argPos))
		args = append(args, *req.Title)
		argPos++
	}
	if req.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argPos))
		args = append(args, *req.Description)
		argPos++
	}
	if req.Category != nil {
		updates = append(updates, fmt.Sprintf("category = $%d", argPos))
		args = append(args, *req.Category)
		argPos++
	}
	if req.Likelihood != nil {
		updates = append(updates, fmt.Sprintf("likelihood = $%d", argPos))
		args = append(args, *req.Likelihood)
		argPos++
	}
	if req.Impact != nil {
		updates = append(updates, fmt.Sprintf("impact = $%d", argPos))
		args = append(args, *req.Impact)
		argPos++
	}
	if req.Status != nil {
		updates = append(updates, fmt.Sprintf("status = $%d", argPos))
		args = append(args, *req.Status)
		argPos++
	}
	if req.OwnerID != nil {
		updates = append(updates, fmt.Sprintf("owner_id = $%d", argPos))
		args = append(args, *req.OwnerID)
		argPos++
	}
	if req.MitigationPlan != nil {
		updates = append(updates, fmt.Sprintf("mitigation_plan = $%d", argPos))
		args = append(args, *req.MitigationPlan)
		argPos++
	}
	if req.ResidualLikelihood != nil {
		updates = append(updates, fmt.Sprintf("residual_likelihood = $%d", argPos))
		args = append(args, *req.ResidualLikelihood)
		argPos++
	}
	if req.ResidualImpact != nil {
		updates = append(updates, fmt.Sprintf("residual_impact = $%d", argPos))
		args = append(args, *req.ResidualImpact)
		argPos++
	}
	if req.ReviewDate != nil {
		updates = append(updates, fmt.Sprintf("review_date = $%d", argPos))
		args = append(args, *req.ReviewDate)
		argPos++
	}

	if len(updates) == 0 {
		return s.GetRiskByID(ctx, riskID)
	}

	args = append(args, riskID)
	query := fmt.Sprintf(`
		UPDATE risk_assessments
		SET %s
		WHERE id = $%d
		RETURNING id, title, description, category, likelihood, impact, risk_score, status,
			owner_id, mitigation_plan, residual_likelihood, residual_impact, residual_risk_score,
			review_date, created_at, updated_at
	`, strings.Join(updates, ", "), argPos)

	var risk RiskAssessment
	err := s.db.QueryRow(ctx, query, args...).Scan(
		&risk.ID, &risk.Title, &risk.Description, &risk.Category, &risk.Likelihood, &risk.Impact,
		&risk.RiskScore, &risk.Status, &risk.OwnerID, &risk.MitigationPlan,
		&risk.ResidualLikelihood, &risk.ResidualImpact, &risk.ResidualRiskScore,
		&risk.ReviewDate, &risk.CreatedAt, &risk.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error updating risk: %w", err)
	}
	return &risk, nil
}

// DeleteRisk deletes a risk assessment (hard delete)
func (s *Store) DeleteRisk(ctx context.Context, riskID string) error {
	_, err := s.db.Exec(ctx, `DELETE FROM risk_assessments WHERE id = $1`, riskID)
	if err != nil {
		return fmt.Errorf("error deleting risk: %w", err)
	}
	return nil
}

// CreateRiskControlMapping links a risk to a control
func (s *Store) CreateRiskControlMapping(ctx context.Context, riskID, controlID string) error {
	_, err := s.db.Exec(ctx, `
		INSERT INTO risk_control_mapping (risk_id, activated_control_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, riskID, controlID)
	return err
}

// DeleteRiskControlMapping removes a risk-control link
func (s *Store) DeleteRiskControlMapping(ctx context.Context, riskID, controlID string) error {
	_, err := s.db.Exec(ctx, `
		DELETE FROM risk_control_mapping
		WHERE risk_id = $1 AND activated_control_id = $2
	`, riskID, controlID)
	return err
}

// GetRiskControls retrieves all controls linked to a risk
func (s *Store) GetRiskControls(ctx context.Context, riskID string) ([]MappedControl, error) {
	rows, err := s.db.Query(ctx, `
		SELECT ac.id, cl.id, cl.name, ac.status, ac.next_review_due_date
		FROM risk_control_mapping rcm
		JOIN activated_controls ac ON rcm.activated_control_id = ac.id
		JOIN control_library cl ON ac.control_library_id = cl.id
		WHERE rcm.risk_id = $1
	`, riskID)
	if err != nil {
		return nil, fmt.Errorf("error querying risk controls: %w", err)
	}
	defer rows.Close()

	var controls []MappedControl
	for rows.Next() {
		var ctrl MappedControl
		if err := rows.Scan(&ctrl.ActivatedControlID, &ctrl.ControlLibraryID, &ctrl.ControlName,
			&ctrl.Status, &ctrl.NextReviewDueDate); err != nil {
			return nil, fmt.Errorf("error scanning control: %w", err)
		}
		controls = append(controls, ctrl)
	}
	return controls, nil
}

// GDPR Data Subject Request (DSR) CRUD operations

// GDPRDSR represents a data subject request
type GDPRDSR struct {
	ID                string     `json:"id"`
	RequestType       string     `json:"request_type"`       // access, erasure, rectification, portability, restriction, objection
	RequesterName     string     `json:"requester_name"`
	RequesterEmail    string     `json:"requester_email"`
	RequesterPhone    *string    `json:"requester_phone"`
	DataSubjectInfo   string     `json:"data_subject_info"`
	RequestDetails    *string    `json:"request_details"`
	Status            string     `json:"status"`             // submitted, under_review, in_progress, completed, rejected
	Priority          string     `json:"priority"`           // low, normal, high, urgent
	AssignedToUserID  *string    `json:"assigned_to_user_id"`
	DeadlineDate      time.Time  `json:"deadline_date"`
	CompletedDate     *time.Time `json:"completed_date"`
	ResponseSummary   *string    `json:"response_summary"`
	RejectionReason   *string    `json:"rejection_reason"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// CreateDSRRequest represents the request body for creating a DSR
type CreateDSRRequest struct {
	RequestType     string  `json:"request_type"`
	RequesterName   string  `json:"requester_name"`
	RequesterEmail  string  `json:"requester_email"`
	RequesterPhone  *string `json:"requester_phone"`
	DataSubjectInfo string  `json:"data_subject_info"`
	RequestDetails  *string `json:"request_details"`
	Priority        string  `json:"priority"`
}

// UpdateDSRRequest represents the request body for updating a DSR
type UpdateDSRRequest struct {
	Status           *string    `json:"status"`
	Priority         *string    `json:"priority"`
	AssignedToUserID *string    `json:"assigned_to_user_id"`
	DeadlineDate     *time.Time `json:"deadline_date"`
	ResponseSummary  *string    `json:"response_summary"`
	RejectionReason  *string    `json:"rejection_reason"`
}

// CreateDSR creates a new data subject request with automatic 30-day deadline
func (s *Store) CreateDSR(ctx context.Context, req CreateDSRRequest) (*GDPRDSR, error) {
	// Calculate deadline (30 days from now, GDPR requirement)
	deadline := time.Now().AddDate(0, 0, 30)

	query := `
		INSERT INTO gdpr_dsr
		(request_type, requester_name, requester_email, requester_phone, data_subject_info,
		 request_details, priority, deadline_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, request_type, requester_name, requester_email, requester_phone,
			data_subject_info, request_details, status, priority, assigned_to_user_id,
			deadline_date, completed_date, response_summary, rejection_reason, created_at, updated_at
	`
	var dsr GDPRDSR
	err := s.db.QueryRow(ctx, query,
		req.RequestType, req.RequesterName, req.RequesterEmail, req.RequesterPhone,
		req.DataSubjectInfo, req.RequestDetails, req.Priority, deadline,
	).Scan(
		&dsr.ID, &dsr.RequestType, &dsr.RequesterName, &dsr.RequesterEmail, &dsr.RequesterPhone,
		&dsr.DataSubjectInfo, &dsr.RequestDetails, &dsr.Status, &dsr.Priority,
		&dsr.AssignedToUserID, &dsr.DeadlineDate, &dsr.CompletedDate, &dsr.ResponseSummary,
		&dsr.RejectionReason, &dsr.CreatedAt, &dsr.UpdatedAt,
	)
	if err != nil {
		log.Printf("Error creating DSR: %v", err)
		return nil, fmt.Errorf("error creating DSR: %w", err)
	}
	return &dsr, nil
}

// GetDSRs retrieves all data subject requests
func (s *Store) GetDSRs(ctx context.Context) ([]GDPRDSR, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, request_type, requester_name, requester_email, requester_phone,
			data_subject_info, request_details, status, priority, assigned_to_user_id,
			deadline_date, completed_date, response_summary, rejection_reason, created_at, updated_at
		FROM gdpr_dsr
		ORDER BY 
			CASE priority
				WHEN 'urgent' THEN 1
				WHEN 'high' THEN 2
				WHEN 'normal' THEN 3
				WHEN 'low' THEN 4
				ELSE 5
			END,
			deadline_date ASC,
			created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("error querying DSRs: %w", err)
	}
	defer rows.Close()

	var dsrs []GDPRDSR
	for rows.Next() {
		var dsr GDPRDSR
		if err := rows.Scan(&dsr.ID, &dsr.RequestType, &dsr.RequesterName, &dsr.RequesterEmail,
			&dsr.RequesterPhone, &dsr.DataSubjectInfo, &dsr.RequestDetails, &dsr.Status,
			&dsr.Priority, &dsr.AssignedToUserID, &dsr.DeadlineDate, &dsr.CompletedDate,
			&dsr.ResponseSummary, &dsr.RejectionReason, &dsr.CreatedAt, &dsr.UpdatedAt); err != nil {
			return nil, fmt.Errorf("error scanning DSR: %w", err)
		}
		dsrs = append(dsrs, dsr)
	}
	return dsrs, nil
}

// GetDSRByID retrieves a single data subject request by ID
func (s *Store) GetDSRByID(ctx context.Context, dsrID string) (*GDPRDSR, error) {
	var dsr GDPRDSR
	err := s.db.QueryRow(ctx, `
		SELECT id, request_type, requester_name, requester_email, requester_phone,
			data_subject_info, request_details, status, priority, assigned_to_user_id,
			deadline_date, completed_date, response_summary, rejection_reason, created_at, updated_at
		FROM gdpr_dsr
		WHERE id = $1
	`, dsrID).Scan(
		&dsr.ID, &dsr.RequestType, &dsr.RequesterName, &dsr.RequesterEmail, &dsr.RequesterPhone,
		&dsr.DataSubjectInfo, &dsr.RequestDetails, &dsr.Status, &dsr.Priority,
		&dsr.AssignedToUserID, &dsr.DeadlineDate, &dsr.CompletedDate, &dsr.ResponseSummary,
		&dsr.RejectionReason, &dsr.CreatedAt, &dsr.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error getting DSR: %w", err)
	}
	return &dsr, nil
}

// UpdateDSR updates a data subject request
func (s *Store) UpdateDSR(ctx context.Context, dsrID string, req UpdateDSRRequest) (*GDPRDSR, error) {
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	if req.Status != nil {
		updates = append(updates, fmt.Sprintf("status = $%d", argPos))
		args = append(args, *req.Status)
		argPos++
	}
	if req.Priority != nil {
		updates = append(updates, fmt.Sprintf("priority = $%d", argPos))
		args = append(args, *req.Priority)
		argPos++
	}
	if req.AssignedToUserID != nil {
		updates = append(updates, fmt.Sprintf("assigned_to_user_id = $%d", argPos))
		args = append(args, *req.AssignedToUserID)
		argPos++
	}
	if req.DeadlineDate != nil {
		updates = append(updates, fmt.Sprintf("deadline_date = $%d", argPos))
		args = append(args, *req.DeadlineDate)
		argPos++
	}
	if req.ResponseSummary != nil {
		updates = append(updates, fmt.Sprintf("response_summary = $%d", argPos))
		args = append(args, *req.ResponseSummary)
		argPos++
	}
	if req.RejectionReason != nil {
		updates = append(updates, fmt.Sprintf("rejection_reason = $%d", argPos))
		args = append(args, *req.RejectionReason)
		argPos++
	}

	if len(updates) == 0 {
		return s.GetDSRByID(ctx, dsrID)
	}

	args = append(args, dsrID)
	query := fmt.Sprintf(`
		UPDATE gdpr_dsr
		SET %s
		WHERE id = $%d
		RETURNING id, request_type, requester_name, requester_email, requester_phone,
			data_subject_info, request_details, status, priority, assigned_to_user_id,
			deadline_date, completed_date, response_summary, rejection_reason, created_at, updated_at
	`, strings.Join(updates, ", "), argPos)

	var dsr GDPRDSR
	err := s.db.QueryRow(ctx, query, args...).Scan(
		&dsr.ID, &dsr.RequestType, &dsr.RequesterName, &dsr.RequesterEmail, &dsr.RequesterPhone,
		&dsr.DataSubjectInfo, &dsr.RequestDetails, &dsr.Status, &dsr.Priority,
		&dsr.AssignedToUserID, &dsr.DeadlineDate, &dsr.CompletedDate, &dsr.ResponseSummary,
		&dsr.RejectionReason, &dsr.CreatedAt, &dsr.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error updating DSR: %w", err)
	}
	return &dsr, nil
}

// CompleteDSR marks a DSR as completed with response summary
func (s *Store) CompleteDSR(ctx context.Context, dsrID string, responseSummary string) (*GDPRDSR, error) {
	var dsr GDPRDSR
	err := s.db.QueryRow(ctx, `
		UPDATE gdpr_dsr
		SET status = 'completed', completed_date = NOW(), response_summary = $1
		WHERE id = $2
		RETURNING id, request_type, requester_name, requester_email, requester_phone,
			data_subject_info, request_details, status, priority, assigned_to_user_id,
			deadline_date, completed_date, response_summary, rejection_reason, created_at, updated_at
	`, responseSummary, dsrID).Scan(
		&dsr.ID, &dsr.RequestType, &dsr.RequesterName, &dsr.RequesterEmail, &dsr.RequesterPhone,
		&dsr.DataSubjectInfo, &dsr.RequestDetails, &dsr.Status, &dsr.Priority,
		&dsr.AssignedToUserID, &dsr.DeadlineDate, &dsr.CompletedDate, &dsr.ResponseSummary,
		&dsr.RejectionReason, &dsr.CreatedAt, &dsr.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("error completing DSR: %w", err)
	}
	return &dsr, nil
}

// ========== ANALYTICS & REPORTING ==========

// ControlComplianceTrend represents control compliance data over time
type ControlComplianceTrend struct {
	Date            string `json:"date"`
	Compliant       int    `json:"compliant"`
	NonCompliant    int    `json:"non_compliant"`
	TotalActivated  int    `json:"total_activated"`
}

// GetControlComplianceTrends returns control compliance trends over a date range
func (s *Store) GetControlComplianceTrends(ctx context.Context, startDate, endDate string) ([]ControlComplianceTrend, error) {
	query := `
		WITH date_series AS (
			SELECT generate_series(
				$1::date,
				$2::date,
				'1 day'::interval
			)::date AS date
		),
		evidence_status AS (
			SELECT DISTINCT ON (cel.activated_control_id, ds.date)
				ds.date,
				cel.activated_control_id,
				cel.compliance_status
			FROM date_series ds
			CROSS JOIN activated_controls ac
			LEFT JOIN control_evidence_log cel
				ON cel.activated_control_id = ac.id
				AND cel.performed_at::date <= ds.date
			WHERE ac.status = 'active'
				AND ac.created_at::date <= ds.date
			ORDER BY cel.activated_control_id, ds.date, cel.performed_at DESC
		)
		SELECT
			ds.date::text,
			COUNT(CASE WHEN es.compliance_status = 'compliant' THEN 1 END) AS compliant,
			COUNT(CASE WHEN es.compliance_status = 'non-compliant' THEN 1 END) AS non_compliant,
			COUNT(DISTINCT ac.id) AS total_activated
		FROM date_series ds
		CROSS JOIN activated_controls ac
		LEFT JOIN evidence_status es ON es.date = ds.date AND es.activated_control_id = ac.id
		WHERE ac.status = 'active' AND ac.created_at::date <= ds.date
		GROUP BY ds.date
		ORDER BY ds.date
	`

	rows, err := s.db.Query(ctx, query, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("error querying compliance trends: %w", err)
	}
	defer rows.Close()

	var trends []ControlComplianceTrend
	for rows.Next() {
		var trend ControlComplianceTrend
		if err := rows.Scan(&trend.Date, &trend.Compliant, &trend.NonCompliant, &trend.TotalActivated); err != nil {
			return nil, fmt.Errorf("error scanning trend row: %w", err)
		}
		trends = append(trends, trend)
	}
	if trends == nil {
		trends = []ControlComplianceTrend{}
	}
	return trends, nil
}

// RiskDistribution represents risk count by severity level
type RiskDistribution struct {
	Severity string `json:"severity"`
	Count    int    `json:"count"`
}

// GetRiskDistribution returns risk counts grouped by severity level
func (s *Store) GetRiskDistribution(ctx context.Context) ([]RiskDistribution, error) {
	query := `
		SELECT
			severity_level AS severity,
			COUNT(*) AS count
		FROM (
			SELECT
				CASE
					WHEN risk_score >= 15 THEN 'Critical'
					WHEN risk_score >= 10 THEN 'High'
					WHEN risk_score >= 6 THEN 'Medium'
					ELSE 'Low'
				END AS severity_level
			FROM risk_assessments
			WHERE status != 'closed'
		) AS risks
		GROUP BY severity_level
		ORDER BY
			CASE severity_level
				WHEN 'Critical' THEN 1
				WHEN 'High' THEN 2
				WHEN 'Medium' THEN 3
				WHEN 'Low' THEN 4
			END
	`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("error querying risk distribution: %w", err)
	}
	defer rows.Close()

	var distribution []RiskDistribution
	for rows.Next() {
		var d RiskDistribution
		if err := rows.Scan(&d.Severity, &d.Count); err != nil {
			return nil, fmt.Errorf("error scanning distribution row: %w", err)
		}
		distribution = append(distribution, d)
	}
	if distribution == nil {
		distribution = []RiskDistribution{}
	}
	return distribution, nil
}

// RiskTrend represents risk metrics over time
type RiskTrend struct {
	Month        string  `json:"month"`
	OpenRisks    int     `json:"open_risks"`
	ClosedRisks  int     `json:"closed_risks"`
	AvgRiskScore float64 `json:"avg_risk_score"`
}

// GetRiskTrends returns risk metrics aggregated by month
func (s *Store) GetRiskTrends(ctx context.Context, months int) ([]RiskTrend, error) {
	query := `
		WITH month_series AS (
			SELECT generate_series(
				DATE_TRUNC('month', CURRENT_DATE - ($1 || ' months')::interval),
				DATE_TRUNC('month', CURRENT_DATE),
				'1 month'::interval
			) AS month
		)
		SELECT
			TO_CHAR(ms.month, 'YYYY-MM') AS month,
			COUNT(CASE WHEN ra.status != 'closed' AND ra.created_at <= ms.month + interval '1 month' THEN 1 END) AS open_risks,
			COUNT(CASE WHEN ra.status = 'closed' AND DATE_TRUNC('month', ra.updated_at) = ms.month THEN 1 END) AS closed_risks,
			COALESCE(AVG(CASE WHEN ra.status != 'closed' AND ra.created_at <= ms.month + interval '1 month' THEN ra.risk_score END), 0) AS avg_risk_score
		FROM month_series ms
		LEFT JOIN risk_assessments ra ON ra.created_at <= ms.month + interval '1 month'
		GROUP BY ms.month
		ORDER BY ms.month
	`

	rows, err := s.db.Query(ctx, query, months)
	if err != nil {
		return nil, fmt.Errorf("error querying risk trends: %w", err)
	}
	defer rows.Close()

	var trends []RiskTrend
	for rows.Next() {
		var trend RiskTrend
		if err := rows.Scan(&trend.Month, &trend.OpenRisks, &trend.ClosedRisks, &trend.AvgRiskScore); err != nil {
			return nil, fmt.Errorf("error scanning trend row: %w", err)
		}
		trends = append(trends, trend)
	}
	if trends == nil {
		trends = []RiskTrend{}
	}
	return trends, nil
}

// DSRMetrics represents GDPR DSR request metrics
type DSRMetrics struct {
	TotalRequests       int     `json:"total_requests"`
	Submitted           int     `json:"submitted"`
	UnderReview         int     `json:"under_review"`
	InProgress          int     `json:"in_progress"`
	Completed           int     `json:"completed"`
	Rejected            int     `json:"rejected"`
	Overdue             int     `json:"overdue"`
	AvgResponseDays     float64 `json:"avg_response_days"`
	CompletionRate      float64 `json:"completion_rate"`
}

// GetDSRMetrics returns comprehensive DSR request metrics
func (s *Store) GetDSRMetrics(ctx context.Context) (*DSRMetrics, error) {
	query := `
		SELECT
			COUNT(*) AS total_requests,
			COUNT(CASE WHEN status = 'submitted' THEN 1 END) AS submitted,
			COUNT(CASE WHEN status = 'under_review' THEN 1 END) AS under_review,
			COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
			COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected,
			COUNT(CASE WHEN deadline_date < CURRENT_DATE AND status NOT IN ('completed', 'rejected') THEN 1 END) AS overdue,
			COALESCE(AVG(CASE WHEN completed_date IS NOT NULL THEN EXTRACT(DAY FROM (completed_date - created_at)) END), 0) AS avg_response_days
		FROM gdpr_dsr
	`

	var metrics DSRMetrics
	err := s.db.QueryRow(ctx, query).Scan(
		&metrics.TotalRequests,
		&metrics.Submitted,
		&metrics.UnderReview,
		&metrics.InProgress,
		&metrics.Completed,
		&metrics.Rejected,
		&metrics.Overdue,
		&metrics.AvgResponseDays,
	)
	if err != nil {
		return nil, fmt.Errorf("error querying DSR metrics: %w", err)
	}

	// Calculate completion rate
	if metrics.TotalRequests > 0 {
		metrics.CompletionRate = (float64(metrics.Completed) / float64(metrics.TotalRequests)) * 100
	}

	return &metrics, nil
}

// AssetBreakdown represents asset counts by type
type AssetBreakdown struct {
	AssetType string `json:"asset_type"`
	Count     int    `json:"count"`
	Active    int    `json:"active"`
	Inactive  int    `json:"inactive"`
}

// GetAssetBreakdown returns asset counts grouped by asset type
func (s *Store) GetAssetBreakdown(ctx context.Context) ([]AssetBreakdown, error) {
	query := `
		SELECT
			asset_type,
			COUNT(*) AS count,
			COUNT(CASE WHEN status = 'active' THEN 1 END) AS active,
			COUNT(CASE WHEN status != 'active' THEN 1 END) AS inactive
		FROM assets
		GROUP BY asset_type
		ORDER BY count DESC
	`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("error querying asset breakdown: %w", err)
	}
	defer rows.Close()

	var breakdown []AssetBreakdown
	for rows.Next() {
		var ab AssetBreakdown
		if err := rows.Scan(&ab.AssetType, &ab.Count, &ab.Active, &ab.Inactive); err != nil {
			return nil, fmt.Errorf("error scanning breakdown row: %w", err)
		}
		breakdown = append(breakdown, ab)
	}
	if breakdown == nil {
		breakdown = []AssetBreakdown{}
	}
	return breakdown, nil
}

// ROPAMetrics represents GDPR ROPA statistics
type ROPAMetrics struct {
	TotalProcessingActivities int `json:"total_processing_activities"`
	Active                    int `json:"active"`
	Draft                     int `json:"draft"`
	Archived                  int `json:"archived"`
}

// GetROPAMetrics returns ROPA statistics
func (s *Store) GetROPAMetrics(ctx context.Context) (*ROPAMetrics, error) {
	query := `
		SELECT
			COUNT(*) AS total,
			COUNT(CASE WHEN status = 'active' THEN 1 END) AS active,
			COUNT(CASE WHEN status = 'draft' THEN 1 END) AS draft,
			COUNT(CASE WHEN status = 'archived' THEN 1 END) AS archived
		FROM gdpr_ropa
	`

	var metrics ROPAMetrics
	err := s.db.QueryRow(ctx, query).Scan(
		&metrics.TotalProcessingActivities,
		&metrics.Active,
		&metrics.Draft,
		&metrics.Archived,
	)
	if err != nil {
		return nil, fmt.Errorf("error querying ROPA metrics: %w", err)
	}

	return &metrics, nil
}

// Vendor Management

type Vendor struct {
	ID                   string     `json:"id"`
	Name                 string     `json:"name"`
	Description          *string    `json:"description"`
	Category             string     `json:"category"`
	RiskTier             string     `json:"risk_tier"`
	Status               string     `json:"status"`
	ContactName          *string    `json:"contact_name"`
	ContactEmail         *string    `json:"contact_email"`
	ContactPhone         *string    `json:"contact_phone"`
	Website              *string    `json:"website"`
	ContractStartDate    *time.Time `json:"contract_start_date"`
	ContractEndDate      *time.Time `json:"contract_end_date"`
	ContractValue        *float64   `json:"contract_value"`
	LastAssessmentDate   *time.Time `json:"last_assessment_date"`
	NextAssessmentDue    *time.Time `json:"next_assessment_due"`
	OwnerID              *string    `json:"owner_id"`
	Notes                *string    `json:"notes"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

type VendorAssessment struct {
	ID                        string     `json:"id"`
	VendorID                  string     `json:"vendor_id"`
	AssessmentDate            time.Time  `json:"assessment_date"`
	AssessorID                *string    `json:"assessor_id"`
	OverallRiskScore          *int       `json:"overall_risk_score"`
	DataSecurityScore         *int       `json:"data_security_score"`
	ComplianceScore           *int       `json:"compliance_score"`
	FinancialStabilityScore   *int       `json:"financial_stability_score"`
	OperationalCapabilityScore *int      `json:"operational_capability_score"`
	Findings                  *string    `json:"findings"`
	Recommendations           *string    `json:"recommendations"`
	Status                    string     `json:"status"`
	CreatedAt                 time.Time  `json:"created_at"`
	UpdatedAt                 time.Time  `json:"updated_at"`
}

func (s *Store) CreateVendor(ctx context.Context, v *Vendor) error {
	query := `
		INSERT INTO vendors (name, description, category, risk_tier, status, contact_name, 
			contact_email, contact_phone, website, contract_start_date, contract_end_date, 
			contract_value, next_assessment_due, owner_id, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, created_at, updated_at`

	err := s.db.QueryRow(ctx, query, v.Name, v.Description, v.Category, v.RiskTier, v.Status,
		v.ContactName, v.ContactEmail, v.ContactPhone, v.Website, v.ContractStartDate,
		v.ContractEndDate, v.ContractValue, v.NextAssessmentDue, v.OwnerID, v.Notes).
		Scan(&v.ID, &v.CreatedAt, &v.UpdatedAt)

	if err != nil {
		log.Printf("Failed to create vendor: %v", err)
		return err
	}

	log.Printf("Vendor created: %s (%s)", v.Name, v.ID)
	return nil
}

func (s *Store) GetVendors(ctx context.Context) ([]Vendor, error) {
	query := `
		SELECT id, name, description, category, risk_tier, status, contact_name, 
			contact_email, contact_phone, website, contract_start_date, contract_end_date, 
			contract_value, last_assessment_date, next_assessment_due, owner_id, notes,
			created_at, updated_at
		FROM vendors
		ORDER BY name ASC`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vendors []Vendor
	for rows.Next() {
		var v Vendor
		err := rows.Scan(&v.ID, &v.Name, &v.Description, &v.Category, &v.RiskTier, &v.Status,
			&v.ContactName, &v.ContactEmail, &v.ContactPhone, &v.Website, &v.ContractStartDate,
			&v.ContractEndDate, &v.ContractValue, &v.LastAssessmentDate, &v.NextAssessmentDue,
			&v.OwnerID, &v.Notes, &v.CreatedAt, &v.UpdatedAt)
		if err != nil {
			return nil, err
		}
		vendors = append(vendors, v)
	}

	return vendors, nil
}

func (s *Store) GetVendorByID(ctx context.Context, id string) (*Vendor, error) {
	query := `
		SELECT id, name, description, category, risk_tier, status, contact_name, 
			contact_email, contact_phone, website, contract_start_date, contract_end_date, 
			contract_value, last_assessment_date, next_assessment_due, owner_id, notes,
			created_at, updated_at
		FROM vendors
		WHERE id = $1`

	var v Vendor
	err := s.db.QueryRow(ctx, query, id).Scan(&v.ID, &v.Name, &v.Description, &v.Category, &v.RiskTier,
		&v.Status, &v.ContactName, &v.ContactEmail, &v.ContactPhone, &v.Website, &v.ContractStartDate,
		&v.ContractEndDate, &v.ContractValue, &v.LastAssessmentDate, &v.NextAssessmentDue,
		&v.OwnerID, &v.Notes, &v.CreatedAt, &v.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return &v, nil
}

func (s *Store) UpdateVendor(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	query := "UPDATE vendors SET "
	args := []interface{}{}
	argPos := 1

	for key, value := range updates {
		if argPos > 1 {
			query += ", "
		}
		query += fmt.Sprintf("%s = $%d", key, argPos)
		args = append(args, value)
		argPos++
	}

	query += fmt.Sprintf(" WHERE id = $%d", argPos)
	args = append(args, id)

	_, err := s.db.Exec(ctx, query, args...)
	if err != nil {
		log.Printf("Failed to update vendor: %v", err)
		return err
	}

	log.Printf("Updated vendor %s", id)
	return nil
}

func (s *Store) DeleteVendor(ctx context.Context, id string) error {
	query := "DELETE FROM vendors WHERE id = $1"
	_, err := s.db.Exec(ctx, query, id)
	if err != nil {
		log.Printf("Failed to delete vendor: %v", err)
		return err
	}

	log.Printf("Deleted vendor %s", id)
	return nil
}

func (s *Store) CreateVendorAssessment(ctx context.Context, va *VendorAssessment) error {
	query := `
		INSERT INTO vendor_assessments (vendor_id, assessment_date, assessor_id, 
			overall_risk_score, data_security_score, compliance_score, 
			financial_stability_score, operational_capability_score, 
			findings, recommendations, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at`

	err := s.db.QueryRow(ctx, query, va.VendorID, va.AssessmentDate, va.AssessorID,
		va.OverallRiskScore, va.DataSecurityScore, va.ComplianceScore,
		va.FinancialStabilityScore, va.OperationalCapabilityScore,
		va.Findings, va.Recommendations, va.Status).
		Scan(&va.ID, &va.CreatedAt, &va.UpdatedAt)

	if err != nil {
		log.Printf("Failed to create vendor assessment: %v", err)
		return err
	}

	// Update vendor's last_assessment_date
	s.db.Exec(ctx, "UPDATE vendors SET last_assessment_date = $1 WHERE id = $2",
		va.AssessmentDate, va.VendorID)

	log.Printf("Vendor assessment created for vendor %s: %s", va.VendorID, va.ID)
	return nil
}

func (s *Store) GetVendorAssessments(ctx context.Context, vendorID string) ([]VendorAssessment, error) {
	query := `
		SELECT id, vendor_id, assessment_date, assessor_id, overall_risk_score, 
			data_security_score, compliance_score, financial_stability_score, 
			operational_capability_score, findings, recommendations, status,
			created_at, updated_at
		FROM vendor_assessments
		WHERE vendor_id = $1
		ORDER BY assessment_date DESC`

	rows, err := s.db.Query(ctx, query, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assessments []VendorAssessment
	for rows.Next() {
		var va VendorAssessment
		err := rows.Scan(&va.ID, &va.VendorID, &va.AssessmentDate, &va.AssessorID,
			&va.OverallRiskScore, &va.DataSecurityScore, &va.ComplianceScore,
			&va.FinancialStabilityScore, &va.OperationalCapabilityScore,
			&va.Findings, &va.Recommendations, &va.Status, &va.CreatedAt, &va.UpdatedAt)
		if err != nil {
			return nil, err
		}
		assessments = append(assessments, va)
	}

	return assessments, nil
}

func (s *Store) GetVendorControls(ctx context.Context, vendorID string) ([]MappedControl, error) {
	query := `
		SELECT ac.id, cl.name, ac.status, ac.next_review_due_date
		FROM vendor_control_mapping vcm
		JOIN activated_controls ac ON vcm.activated_control_id = ac.id
		JOIN control_library cl ON ac.control_library_id = cl.id
		WHERE vcm.vendor_id = $1
		ORDER BY cl.name ASC`

	rows, err := s.db.Query(ctx, query, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var controls []MappedControl
	for rows.Next() {
		var mc MappedControl
		err := rows.Scan(&mc.ActivatedControlID, &mc.ControlName, &mc.Status, mc.NextReviewDueDate)
		if err != nil {
			return nil, err
		}
		controls = append(controls, mc)
	}

	return controls, nil
}

func (s *Store) CreateVendorControlMapping(ctx context.Context, vendorID, controlID string) error {
	query := "INSERT INTO vendor_control_mapping (vendor_id, activated_control_id) VALUES ($1, $2)"
	_, err := s.db.Exec(ctx, query, vendorID, controlID)
	if err != nil {
		log.Printf("Failed to create vendor-control mapping: %v", err)
		return err
	}

	log.Printf("Mapped control %s to vendor %s", controlID, vendorID)
	return nil
}

func (s *Store) DeleteVendorControlMapping(ctx context.Context, vendorID, controlID string) error {
	query := "DELETE FROM vendor_control_mapping WHERE vendor_id = $1 AND activated_control_id = $2"
	_, err := s.db.Exec(ctx, query, vendorID, controlID)
	if err != nil {
		log.Printf("Failed to delete vendor-control mapping: %v", err)
		return err
	}

	log.Printf("Unmapped control %s from vendor %s", controlID, vendorID)
	return nil
}
