package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

// extractIPAddress extracts IP from RemoteAddr, handling both IPv4 and IPv6
func extractIPAddress(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		// If parsing fails, return the original address
		return remoteAddr
	}
	return host
}

// (Define context keys for auth)
type contextKey string

const (
	UserIDKey contextKey = "userID"
	RoleKey   contextKey = "role"
)

// ApiServer holds the store
type ApiServer struct {
	store *Store
}

func NewApiServer(store *Store) *ApiServer { return &ApiServer{store: store} }

// HandleGetAuditLogs handles GET /api/v1/audit/logs
func (s *ApiServer) HandleGetAuditLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// (Auth: Check role from context - should be 'admin')
	// role := r.Context().Value(RoleKey).(string)
	// if role != "admin" { http.Error(w, "Forbidden", http.StatusForbidden); return }

	// Parse query parameters for filtering
	var userID *string
	if userIDParam := r.URL.Query().Get("user_id"); userIDParam != "" {
		userID = &userIDParam
	}

	var actionType *string
	if actionTypeParam := r.URL.Query().Get("action_type"); actionTypeParam != "" {
		actionType = &actionTypeParam
	}

	var entityType *string
	if entityTypeParam := r.URL.Query().Get("entity_type"); entityTypeParam != "" {
		entityType = &entityTypeParam
	}

	// Parse pagination parameters
	limit := 100 // Default
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil && l > 0 && l <= 1000 {
			limit = l
		}
	}

	offset := 0
	if offsetParam := r.URL.Query().Get("offset"); offsetParam != "" {
		if o, err := strconv.Atoi(offsetParam); err == nil && o >= 0 {
			offset = o
		}
	}

	// Get audit logs
	logs, err := s.store.GetAuditLogs(r.Context(), limit, offset, userID, actionType, entityType)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

// HandleDashboardSummary handles GET /api/v1/dashboard/summary
func (s *ApiServer) HandleDashboardSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Get total controls from library
	totalControls, err := s.store.GetControlLibrary(r.Context())
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Get activated controls
	activatedControls, err := s.store.GetActiveControlsList(r.Context())
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Get all tickets
	tickets, err := s.store.GetAllTickets(r.Context())
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Count control statuses
	compliantCount := 0
	nonCompliantCount := 0
	overdueCount := 0
	for _, ctrl := range activatedControls {
		if ctrl.Status == "compliant" {
			compliantCount++
		} else if ctrl.Status == "non_compliant" {
			nonCompliantCount++
			overdueCount++ // Simplified: treat non-compliant as overdue
		}
	}

	// Calculate compliance percentage
	compliancePercentage := 0.0
	if len(activatedControls) > 0 {
		compliancePercentage = (float64(compliantCount) / float64(len(activatedControls))) * 100
	}

	// Count ticket statuses
	openTickets := 0
	resolvedTickets := 0
	for _, ticket := range tickets {
		if ticket.Status == "new" || ticket.Status == "in_progress" {
			openTickets++
		} else if ticket.Status == "resolved" || ticket.Status == "closed" {
			resolvedTickets++
		}
	}

	// Build nested response structure to match frontend
	summary := map[string]interface{}{
		"controls": map[string]interface{}{
			"total":                len(totalControls),
			"activated":            len(activatedControls),
			"compliant":            compliantCount,
			"nonCompliant":         nonCompliantCount,
			"overdue":              overdueCount,
			"compliancePercentage": compliancePercentage,
		},
		"tickets": map[string]interface{}{
			"totalTickets":       len(tickets),
			"openTickets":        openTickets,
			"resolvedThisMonth": resolvedTickets, // Simplified: all resolved
		},
		"assets": map[string]interface{}{
			"total": 0, // Not implemented yet
		},
		"documents": map[string]interface{}{
			"total": 0, // Not implemented yet
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// HandleLogin handles POST /api/v1/auth/login
func (s *ApiServer) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	// Authenticate user (simplified - in production use proper password hashing)
	user, err := s.store.AuthenticateUser(r.Context(), req.Email, req.Password)
	if err != nil {
		if err.Error() == "invalid credentials" {
			// Log failed login attempt
			ipAddr := extractIPAddress(r.RemoteAddr)
			changes := map[string]interface{}{"email": req.Email, "result": "failed"}
			s.store.LogAudit(r.Context(), nil, "USER_LOGIN_FAILURE", nil, nil, changes, &ipAddr)
			http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Generate JWT token
	token, err := GenerateJWT(user.ID, user.Email, user.Role)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Log successful login
	ipAddr := extractIPAddress(r.RemoteAddr)
	changes := map[string]interface{}{"email": req.Email, "result": "success", "role": user.Role}
	entityType := "user"
	s.store.LogAudit(r.Context(), &user.ID, "USER_LOGIN_SUCCESS", &entityType, &user.ID, changes, &ipAddr)

	response := LoginResponse{
		User:  *user,
		Token: token,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleGetControlLibrary handles GET /api/v1/controls/library
func (s *ApiServer) HandleGetControlLibrary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}
	// (Auth middleware would have run)

	controls, err := s.store.GetControlLibrary(r.Context())
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(controls)
}

// HandleCreateControlLibraryItem handles POST /api/v1/controls/library (admin only)
func (s *ApiServer) HandleCreateControlLibraryItem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	userID, _ := r.Context().Value(UserIDKey).(string)

	var control ControlLibraryItem
	if err := json.NewDecoder(r.Body).Decode(&control); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if control.ID == "" || control.Standard == "" || control.Family == "" || control.Name == "" || control.Description == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	newControl, err := s.store.CreateControlLibraryItem(r.Context(), control)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			http.Error(w, "Control ID already exists", http.StatusConflict)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Audit log
	changes := map[string]interface{}{"control_id": control.ID, "standard": control.Standard}
	entityType := "control_library"
	s.store.LogAudit(r.Context(), &userID, "CONTROL_LIBRARY_CREATED", &entityType, &newControl.ID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newControl)
}

// HandleUpdateControlLibraryItem handles PUT /api/v1/controls/library/{id} (admin only)
func (s *ApiServer) HandleUpdateControlLibraryItem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	userID, _ := r.Context().Value(UserIDKey).(string)
	controlID := strings.TrimPrefix(r.URL.Path, "/api/v1/controls/library/")

	if controlID == "" {
		http.Error(w, "Missing control ID", http.StatusBadRequest)
		return
	}

	var control ControlLibraryItem
	if err := json.NewDecoder(r.Body).Decode(&control); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if control.Standard == "" || control.Family == "" || control.Name == "" || control.Description == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	updated, err := s.store.UpdateControlLibraryItem(r.Context(), controlID, control)
	if err != nil {
		if err.Error() == "control not found" {
			http.Error(w, "Control not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Audit log
	changes := map[string]interface{}{"control_id": controlID, "standard": control.Standard}
	entityType := "control_library"
	s.store.LogAudit(r.Context(), &userID, "CONTROL_LIBRARY_UPDATED", &entityType, &updated.ID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

// HandleDeleteControlLibraryItem handles DELETE /api/v1/controls/library/{id} (admin only)
func (s *ApiServer) HandleDeleteControlLibraryItem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	userID, _ := r.Context().Value(UserIDKey).(string)
	controlID := strings.TrimPrefix(r.URL.Path, "/api/v1/controls/library/")

	if controlID == "" {
		http.Error(w, "Missing control ID", http.StatusBadRequest)
		return
	}

	err := s.store.DeleteControlLibraryItem(r.Context(), controlID)
	if err != nil {
		if err.Error() == "control not found" {
			http.Error(w, "Control not found", http.StatusNotFound)
			return
		}
		if strings.Contains(err.Error(), "cannot delete control") {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Audit log
	changes := map[string]interface{}{"control_id": controlID}
	entityType := "control_library"
	s.store.LogAudit(r.Context(), &userID, "CONTROL_LIBRARY_DELETED", &entityType, &controlID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// HandleImportControls handles POST /api/v1/controls/library/import (admin only)
func (s *ApiServer) HandleImportControls(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	userID, _ := r.Context().Value(UserIDKey).(string)

	var req struct {
		Controls        []ControlLibraryItem `json:"controls"`
		ReplaceExisting bool                 `json:"replace_existing"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if len(req.Controls) == 0 {
		http.Error(w, "No controls provided", http.StatusBadRequest)
		return
	}

	// Validate controls
	for i, control := range req.Controls {
		if control.ID == "" || control.Standard == "" || control.Name == "" {
			http.Error(w, fmt.Sprintf("Invalid control at index %d: missing required fields", i), http.StatusBadRequest)
			return
		}
	}

	count, err := s.store.BulkImportControls(r.Context(), req.Controls, req.ReplaceExisting)
	if err != nil {
		http.Error(w, "Import failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Audit log
	changes := map[string]interface{}{
		"total_controls":    len(req.Controls),
		"imported_count":    count,
		"replace_existing": req.ReplaceExisting,
	}
	entityType := "control_library"
	s.store.LogAudit(r.Context(), &userID, "CONTROL_LIBRARY_BULK_IMPORT", &entityType, nil, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"imported_count": count,
		"total_sent":     len(req.Controls),
	})
}

// HandleExportControls handles GET /api/v1/controls/library/export
func (s *ApiServer) HandleExportControls(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	controls, err := s.store.GetControlLibrary(r.Context())
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=control-library-export.json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"controls":      controls,
		"exported_at":   time.Now().Format(time.RFC3339),
		"total_count":   len(controls),
		"export_version": "1.0",
	})
}

// HandleActivatedControls routes GET and POST for /api/v1/controls/activated
func (s *ApiServer) HandleActivatedControls(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleGetActiveControlsList(w, r)
	case http.MethodPost:
		s.handleActivateControl(w, r)
	default:
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
	}
}

// handleGetActiveControlsList handles GET
func (s *ApiServer) handleGetActiveControlsList(w http.ResponseWriter, r *http.Request) {
	controls, err := s.store.GetActiveControlsList(r.Context())
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(controls)
}

// handleActivateControl handles POST
func (s *ApiServer) handleActivateControl(w http.ResponseWriter, r *http.Request) {
	// Role check is done by middleware
	userID, _ := r.Context().Value(UserIDKey).(string)

	var req ActivateControlRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.ControlLibraryID == "" || req.OwnerID == "" || req.ReviewIntervalDays <= 0 {
		http.Error(w, "Missing or invalid fields", http.StatusBadRequest)
		return
	}

	newControl, err := s.store.ActivateControl(r.Context(), req)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	
	// Log control activation
	changes := map[string]interface{}{
		"control_library_id": req.ControlLibraryID,
		"owner_id":           req.OwnerID,
		"review_interval":    req.ReviewIntervalDays,
	}
	entityType := "activated_control"
	s.store.LogAudit(r.Context(), &userID, "CONTROL_ACTIVATED", &entityType, &newControl.ID, changes, nil)
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newControl)
}

// HandleSpecificActivatedControl routes /.../{id}/...
func (s *ApiServer) HandleSpecificActivatedControl(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/controls/activated/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Missing control ID", http.StatusBadRequest)
		return
	}
	controlID := parts[0]

	if len(parts) == 2 && parts[1] == "evidence" {
		if r.Method == http.MethodPost {
			s.handleSubmitControlEvidence(w, r, controlID)
			return
		}
	}
	http.Error(w, "Not Found", http.StatusNotFound)
}

// handleSubmitControlEvidence handles POST /.../{id}/evidence
func (s *ApiServer) handleSubmitControlEvidence(w http.ResponseWriter, r *http.Request, activatedControlID string) {
	// Get user ID from context (auth middleware ensures this exists)
	userID, _ := r.Context().Value(UserIDKey).(string)
	// TODO: Check if user is owner or admin for this specific control

	var req SubmitEvidenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.ComplianceStatus == "" || req.Notes == "" {
		http.Error(w, "Missing fields (compliance_status, notes)", http.StatusBadRequest)
		return
	}

	newLogEntry, err := s.store.SubmitControlEvidence(r.Context(), activatedControlID, userID, req)
	if err != nil {
		if err.Error() == "control not found" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	
	// Log evidence submission
	changes := map[string]interface{}{
		"activated_control_id": activatedControlID,
		"compliance_status":    req.ComplianceStatus,
		"evidence_id":          newLogEntry.ID,
	}
	entityType := "control_evidence"
	s.store.LogAudit(r.Context(), &userID, "EVIDENCE_SUBMITTED", &entityType, &newLogEntry.ID, changes, nil)
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newLogEntry)
}

// HandleCreateInternalTicket handles POST /api/v1/tickets/internal
func (s *ApiServer) HandleCreateInternalTicket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from context (auth middleware ensures this exists)
	userID, _ := r.Context().Value(UserIDKey).(string)

	var req CreateInternalTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		http.Error(w, "Field 'title' is required", http.StatusBadRequest)
		return
	}

	newTicket, err := s.store.CreateInternalTicket(r.Context(), userID, req)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	
	// Log ticket creation
	changes := map[string]interface{}{
		"ticket_type":  "internal",
		"title":        req.Title,
		"sequential_id": newTicket.SequentialID,
	}
	entityType := "ticket"
	s.store.LogAudit(r.Context(), &userID, "TICKET_CREATED", &entityType, &newTicket.ID, changes, nil)
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newTicket)
}

// HandleCreateExternalTicket handles POST /api/v1/tickets/external
func (s *ApiServer) HandleCreateExternalTicket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// API key authentication for external portal
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		http.Error(w, "API key required", http.StatusUnauthorized)
		return
	}

	// Validate API key (in production, this would check against a database)
	expectedApiKey := os.Getenv("EXTERNAL_API_KEY")
	if expectedApiKey == "" {
		expectedApiKey = "test-api-key" // Default for development
	}
	if apiKey != expectedApiKey {
		http.Error(w, "Invalid API key", http.StatusUnauthorized)
		return
	}

	var req CreateExternalTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Title == "" || req.ExternalCustomerRef == "" {
		http.Error(w, "Fields 'title' and 'external_customer_ref' are required", http.StatusBadRequest)
		return
	}

	newTicket, err := s.store.CreateExternalTicket(r.Context(), req)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	
	// Log external ticket creation
	changes := map[string]interface{}{
		"ticket_type":           "external",
		"title":                 req.Title,
		"external_customer_ref": req.ExternalCustomerRef,
		"sequential_id":         newTicket.SequentialID,
	}
	entityType := "ticket"
	s.store.LogAudit(r.Context(), nil, "TICKET_CREATED_EXTERNAL", &entityType, &newTicket.ID, changes, nil)
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newTicket)
}

func (s *ApiServer) HandleGetTickets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID and role from context
	userID := r.Context().Value(UserIDKey).(string)
	role := r.Context().Value(RoleKey).(string)

	// Parse query parameters
	ticketType := r.URL.Query().Get("type") // "internal" or "external"

	// Get tickets based on role and type
	var tickets []Ticket
	var err error

	if role == "admin" {
		// Admin can see all tickets, optionally filtered by type
		if ticketType == "internal" {
			tickets, err = s.store.GetTicketsByType(r.Context(), "internal")
		} else if ticketType == "external" {
			tickets, err = s.store.GetTicketsByType(r.Context(), "external")
		} else {
			tickets, err = s.store.GetAllTickets(r.Context())
		}
	} else {
		// User can only see tickets they created or are assigned to
		tickets, err = s.store.GetTicketsForUser(r.Context(), userID)
	}

	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tickets)
}

func (s *ApiServer) HandleGetTicket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Extract ticket ID from URL
	vars := mux.Vars(r)
	ticketID := vars["id"]
	if ticketID == "" {
		http.Error(w, "Missing ticket ID", http.StatusBadRequest)
		return
	}

	// Get user ID and role from context
	userID := r.Context().Value(UserIDKey).(string)
	role := r.Context().Value(RoleKey).(string)

	ticket, err := s.store.GetTicketByID(r.Context(), ticketID)
	if err != nil {
		if err.Error() == "ticket not found" {
			http.Error(w, "Ticket not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Check permissions
	if role != "admin" {
		// Users can only see tickets they created or are assigned to
		if ticket.CreatedByUserID.String != userID && ticket.AssignedToUserID.String != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	}

	// Get comments for the ticket
	comments, err := s.store.GetTicketComments(r.Context(), ticketID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// For external tickets, filter out internal comments
	if ticket.TicketType == "external" {
		var filteredComments []TicketComment
		for _, comment := range comments {
			if !comment.IsInternalNote {
				filteredComments = append(filteredComments, comment)
			}
		}
		comments = filteredComments
	}

	// Create response with ticket and comments
	response := map[string]interface{}{
		"ticket":   ticket,
		"comments": comments,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *ApiServer) HandleAddTicketComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Extract ticket ID from URL
	vars := mux.Vars(r)
	ticketID := vars["id"]
	if ticketID == "" {
		http.Error(w, "Missing ticket ID", http.StatusBadRequest)
		return
	}

	// Get user ID and role from context
	userID := r.Context().Value(UserIDKey).(string)
	role := r.Context().Value(RoleKey).(string)

	// Check if ticket exists and user has permission
	ticket, err := s.store.GetTicketByID(r.Context(), ticketID)
	if err != nil {
		if err.Error() == "ticket not found" {
			http.Error(w, "Ticket not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Check permissions
	if role != "admin" {
		// Users can only comment on tickets they created or are assigned to
		if ticket.CreatedByUserID.String != userID && ticket.AssignedToUserID.String != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	}

	var req AddCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Body == "" {
		http.Error(w, "Field 'body' is required", http.StatusBadRequest)
		return
	}

	newComment, err := s.store.AddTicketComment(r.Context(), ticketID, userID, req)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	
	// Log comment addition
	changes := map[string]interface{}{
		"ticket_id":        ticketID,
		"is_internal_note": req.IsInternalNote,
	}
	entityType := "ticket_comment"
	s.store.LogAudit(r.Context(), &userID, "TICKET_COMMENT_ADDED", &entityType, &newComment.ID, changes, nil)
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newComment)
}

// HandleUpdateTicket handles PUT /api/v1/tickets/{id}
func (s *ApiServer) HandleUpdateTicket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Extract ticket ID from URL
	vars := mux.Vars(r)
	ticketID := vars["id"]
	if ticketID == "" {
		http.Error(w, "Missing ticket ID", http.StatusBadRequest)
		return
	}

	// Get role from context (user ID not needed for admin-only check)
	role := r.Context().Value(RoleKey).(string)

	// Check permissions - only admins can update tickets
	if role != "admin" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req UpdateTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	updatedTicket, err := s.store.UpdateTicket(r.Context(), ticketID, req)
	if err != nil {
		if err.Error() == "ticket not found" {
			http.Error(w, "Ticket not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	// (TODO: Call audit log)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedTicket)
}

// HandleGetTicketsByCustomerRef handles GET /api/v1/tickets/external/{customerRef}
func (s *ApiServer) HandleGetTicketsByCustomerRef(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Extract customer reference from URL
	vars := mux.Vars(r)
	customerRef := vars["customerRef"]
	if customerRef == "" {
		http.Error(w, "Missing customer reference", http.StatusBadRequest)
		return
	}

	// API key authentication for external portal
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		http.Error(w, "API key required", http.StatusUnauthorized)
		return
	}

	// Validate API key (in production, this would check against a database)
	expectedApiKey := os.Getenv("EXTERNAL_API_KEY")
	if expectedApiKey == "" {
		expectedApiKey = "test-api-key" // Default for development
	}
	if apiKey != expectedApiKey {
		http.Error(w, "Invalid API key", http.StatusUnauthorized)
		return
	}

	tickets, err := s.store.GetTicketsByCustomerRef(r.Context(), customerRef)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"tickets": tickets,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleGetNotifications handles GET /api/v1/notifications
func (s *ApiServer) HandleGetNotifications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from context
	userID := r.Context().Value(UserIDKey).(string)

	// Parse query parameters
	onlyUnread := r.URL.Query().Get("unread") == "true"

	notifications, err := s.store.GetNotificationsForUser(r.Context(), userID, onlyUnread)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

// HandleMarkNotificationAsRead handles POST /api/v1/notifications/{id}/read
func (s *ApiServer) HandleMarkNotificationAsRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Extract notification ID from URL
	vars := mux.Vars(r)
	notificationID := vars["id"]
	if notificationID == "" {
		http.Error(w, "Missing notification ID", http.StatusBadRequest)
		return
	}

	// Get user ID from context
	userID := r.Context().Value(UserIDKey).(string)

	err := s.store.MarkNotificationAsRead(r.Context(), notificationID, userID)
	if err != nil {
		if err.Error() == "notification not found or not owned by user" {
			http.Error(w, "Notification not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "marked as read"})
}

// HandleCreateAsset handles POST /api/v1/assets
func (s *ApiServer) HandleCreateAsset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req CreateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.AssetType == "" || req.OwnerID == "" {
		http.Error(w, "Missing required fields: name, asset_type, owner_id", http.StatusBadRequest)
		return
	}

	newAsset, err := s.store.CreateAsset(r.Context(), req)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log asset creation
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"name":       req.Name,
		"asset_type": req.AssetType,
		"owner_id":   req.OwnerID,
	}
	entityType := "asset"
	s.store.LogAudit(r.Context(), &userID, "ASSET_CREATED", &entityType, &newAsset.ID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newAsset)
}

// HandleGetAssets handles GET /api/v1/assets
func (s *ApiServer) HandleGetAssets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	assets, err := s.store.GetAssets(r.Context())
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(assets)
}

// HandleGetAsset handles GET /api/v1/assets/{id}
func (s *ApiServer) HandleGetAsset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	assetID := vars["id"]
	if assetID == "" {
		http.Error(w, "Missing asset ID", http.StatusBadRequest)
		return
	}

	asset, err := s.store.GetAssetByID(r.Context(), assetID)
	if err != nil {
		if err.Error() == "asset not found" {
			http.Error(w, "Asset not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(asset)
}

// HandleUpdateAsset handles PUT /api/v1/assets/{id}
func (s *ApiServer) HandleUpdateAsset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	assetID := vars["id"]
	if assetID == "" {
		http.Error(w, "Missing asset ID", http.StatusBadRequest)
		return
	}

	var req UpdateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	updatedAsset, err := s.store.UpdateAsset(r.Context(), assetID, req)
	if err != nil {
		if err.Error() == "asset not found" {
			http.Error(w, "Asset not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log asset update
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{"updated_fields": req}
	entityType := "asset"
	s.store.LogAudit(r.Context(), &userID, "ASSET_UPDATED", &entityType, &assetID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedAsset)
}

// HandleDeleteAsset handles DELETE /api/v1/assets/{id}
func (s *ApiServer) HandleDeleteAsset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	assetID := vars["id"]
	if assetID == "" {
		http.Error(w, "Missing asset ID", http.StatusBadRequest)
		return
	}

	err := s.store.DeleteAsset(r.Context(), assetID)
	if err != nil {
		if err.Error() == "asset not found" {
			http.Error(w, "Asset not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log asset deletion
	userID := r.Context().Value(UserIDKey).(string)
	entityType := "asset"
	s.store.LogAudit(r.Context(), &userID, "ASSET_DELETED", &entityType, &assetID, nil, nil)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// HandleCreateAssetControlMapping handles POST /api/v1/mappings/asset-to-control
func (s *ApiServer) HandleCreateAssetControlMapping(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		AssetID            string `json:"asset_id"`
		ActivatedControlID string `json:"activated_control_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.AssetID == "" || req.ActivatedControlID == "" {
		http.Error(w, "Missing required fields: asset_id, activated_control_id", http.StatusBadRequest)
		return
	}

	// Create mapping in database
	query := `INSERT INTO asset_control_mapping (asset_id, activated_control_id) VALUES ($1, $2)`
	_, err := s.store.db.Exec(r.Context(), query, req.AssetID, req.ActivatedControlID)
	if err != nil {
		log.Printf("Error creating asset-control mapping: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log mapping creation
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"asset_id":             req.AssetID,
		"activated_control_id": req.ActivatedControlID,
	}
	entityType := "asset_control_mapping"
	s.store.LogAudit(r.Context(), &userID, "ASSET_CONTROL_MAPPED", &entityType, nil, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "created"})
}

// HandleDeleteAssetControlMapping handles DELETE /api/v1/mappings/asset-to-control
func (s *ApiServer) HandleDeleteAssetControlMapping(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		AssetID            string `json:"asset_id"`
		ActivatedControlID string `json:"activated_control_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.AssetID == "" || req.ActivatedControlID == "" {
		http.Error(w, "Missing required fields: asset_id, activated_control_id", http.StatusBadRequest)
		return
	}

	// Delete mapping from database
	query := `DELETE FROM asset_control_mapping WHERE asset_id = $1 AND activated_control_id = $2`
	result, err := s.store.db.Exec(r.Context(), query, req.AssetID, req.ActivatedControlID)
	if err != nil {
		log.Printf("Error deleting asset-control mapping: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if result.RowsAffected() == 0 {
		http.Error(w, "Mapping not found", http.StatusNotFound)
		return
	}

	// Log mapping deletion
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"asset_id":             req.AssetID,
		"activated_control_id": req.ActivatedControlID,
	}
	entityType := "asset_control_mapping"
	s.store.LogAudit(r.Context(), &userID, "ASSET_CONTROL_UNMAPPED", &entityType, nil, changes, nil)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// HandleGetAssetControlMappings handles GET /api/v1/assets/{id}/controls
func (s *ApiServer) HandleGetAssetControlMappings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	assetID := vars["id"]
	if assetID == "" {
		http.Error(w, "Missing asset ID", http.StatusBadRequest)
		return
	}

	// Get mapped controls for this asset
	query := `
		SELECT ac.id, cl.name, ac.status, ac.next_review_due_date
		FROM asset_control_mapping acm
		JOIN activated_controls ac ON acm.activated_control_id = ac.id
		JOIN control_library cl ON ac.control_library_id = cl.id
		WHERE acm.asset_id = $1
		ORDER BY cl.name
	`

	rows, err := s.store.db.Query(r.Context(), query, assetID)
	if err != nil {
		log.Printf("Error querying asset controls: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type MappedControl struct {
		ID               string     `json:"id"`
		Name             string     `json:"name"`
		Status           string     `json:"status"`
		NextReviewDueDate *time.Time `json:"next_review_due_date,omitempty"`
	}

	var controls []MappedControl
	for rows.Next() {
		var ctrl MappedControl
		if err := rows.Scan(&ctrl.ID, &ctrl.Name, &ctrl.Status, &ctrl.NextReviewDueDate); err != nil {
			log.Printf("Error scanning control row: %v", err)
			continue
		}
		controls = append(controls, ctrl)
	}

	if controls == nil {
		controls = make([]MappedControl, 0)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(controls)
}

// ========== DOCUMENT MANAGEMENT HANDLERS ==========

// HandleCreateDocument handles POST /api/v1/documents
func (s *ApiServer) HandleCreateDocument(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req CreateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.Category == "" || req.OwnerID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	doc, err := s.store.CreateDocument(r.Context(), req.Title, req.Category, req.OwnerID)
	if err != nil {
		log.Printf("Error creating document: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log document creation
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"title":    req.Title,
		"category": req.Category,
		"owner_id": req.OwnerID,
	}
	entityType := "document"
	s.store.LogAudit(r.Context(), &userID, "DOCUMENT_CREATED", &entityType, &doc.ID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(doc)
}

// HandleGetDocuments handles GET /api/v1/documents
func (s *ApiServer) HandleGetDocuments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	documents, err := s.store.GetDocuments(r.Context())
	if err != nil {
		log.Printf("Error getting documents: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(documents)
}

// HandleGetDocument handles GET /api/v1/documents/{id}
func (s *ApiServer) HandleGetDocument(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	documentID := vars["id"]

	doc, err := s.store.GetDocumentByID(r.Context(), documentID)
	if err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	// Get versions for this document
	versions, err := s.store.GetDocumentVersions(r.Context(), documentID)
	if err != nil {
		log.Printf("Error getting document versions: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"document": doc,
		"versions": versions,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleCreateDocumentVersion handles POST /api/v1/documents/{id}/versions
func (s *ApiServer) HandleCreateDocumentVersion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	documentID := vars["id"]

	var req CreateDocumentVersionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.BodyContent == "" {
		http.Error(w, "body_content is required", http.StatusBadRequest)
		return
	}

	userID := r.Context().Value(UserIDKey).(string)

	version, err := s.store.CreateDocumentVersion(r.Context(), documentID, req.BodyContent, req.ChangeDescription, userID)
	if err != nil {
		log.Printf("Error creating document version: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log version creation
	changes := map[string]interface{}{
		"document_id":      documentID,
		"version_number":   version.VersionNumber,
		"change_description": req.ChangeDescription,
	}
	entityType := "document_version"
	s.store.LogAudit(r.Context(), &userID, "DOCUMENT_VERSION_CREATED", &entityType, &version.ID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(version)
}

// HandlePublishDocumentVersion handles PUT /api/v1/documents/{doc_id}/versions/{version_id}/publish
func (s *ApiServer) HandlePublishDocumentVersion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	documentID := vars["doc_id"]
	versionID := vars["version_id"]

	err := s.store.PublishDocumentVersion(r.Context(), versionID, documentID)
	if err != nil {
		log.Printf("Error publishing document version: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log version publication
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"document_id": documentID,
		"version_id":  versionID,
	}
	entityType := "document_version"
	s.store.LogAudit(r.Context(), &userID, "DOCUMENT_VERSION_PUBLISHED", &entityType, &versionID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "published"})
}

// HandleAcknowledgeDocument handles POST /api/v1/versions/{id}/acknowledge
func (s *ApiServer) HandleAcknowledgeDocument(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	versionID := vars["id"]

	userID := r.Context().Value(UserIDKey).(string)

	err := s.store.AcknowledgeDocument(r.Context(), versionID, userID)
	if err != nil {
		log.Printf("Error acknowledging document: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log acknowledgement
	changes := map[string]interface{}{
		"version_id": versionID,
		"user_id":    userID,
	}
	entityType := "document_read_acknowledgement"
	s.store.LogAudit(r.Context(), &userID, "DOCUMENT_ACKNOWLEDGED", &entityType, &versionID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "acknowledged"})
}

// HandleCreateDocumentControlMapping handles POST /api/v1/mappings/document-to-control
func (s *ApiServer) HandleCreateDocumentControlMapping(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		DocumentID         string `json:"document_id"`
		ActivatedControlID string `json:"activated_control_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.DocumentID == "" || req.ActivatedControlID == "" {
		http.Error(w, "Missing required fields: document_id, activated_control_id", http.StatusBadRequest)
		return
	}

	err := s.store.CreateDocumentControlMapping(r.Context(), req.DocumentID, req.ActivatedControlID)
	if err != nil {
		log.Printf("Error creating document-control mapping: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log mapping creation
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"document_id":          req.DocumentID,
		"activated_control_id": req.ActivatedControlID,
	}
	entityType := "document_control_mapping"
	s.store.LogAudit(r.Context(), &userID, "DOCUMENT_CONTROL_MAPPED", &entityType, nil, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "created"})
}

// HandleDeleteDocumentControlMapping handles DELETE /api/v1/mappings/document-to-control
func (s *ApiServer) HandleDeleteDocumentControlMapping(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		DocumentID         string `json:"document_id"`
		ActivatedControlID string `json:"activated_control_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.DocumentID == "" || req.ActivatedControlID == "" {
		http.Error(w, "Missing required fields: document_id, activated_control_id", http.StatusBadRequest)
		return
	}

	err := s.store.DeleteDocumentControlMapping(r.Context(), req.DocumentID, req.ActivatedControlID)
	if err != nil {
		log.Printf("Error deleting document-control mapping: %v", err)
		if err.Error() == "mapping not found" {
			http.Error(w, "Mapping not found", http.StatusNotFound)
		} else {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}

	// Log mapping deletion
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"document_id":          req.DocumentID,
		"activated_control_id": req.ActivatedControlID,
	}
	entityType := "document_control_mapping"
	s.store.LogAudit(r.Context(), &userID, "DOCUMENT_CONTROL_UNMAPPED", &entityType, nil, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// ========== GDPR ROPA HANDLERS ==========

// HandleCreateROPA handles POST /api/v1/gdpr/ropa
func (s *ApiServer) HandleCreateROPA(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req CreateROPARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ActivityName == "" || req.DataControllerDetails == "" || req.DataCategories == "" || req.DataSubjectCategories == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	ropa, err := s.store.CreateROPA(r.Context(), req)
	if err != nil {
		log.Printf("Error creating ROPA: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log ROPA creation
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"activity_name": req.ActivityName,
		"department":    req.Department,
		"status":        "draft",
	}
	entityType := "gdpr_ropa"
	s.store.LogAudit(r.Context(), &userID, "ROPA_CREATED", &entityType, &ropa.ID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ropa)
}

// HandleGetROPAs handles GET /api/v1/gdpr/ropa
func (s *ApiServer) HandleGetROPAs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	ropas, err := s.store.GetROPAs(r.Context())
	if err != nil {
		log.Printf("Error getting ROPAs: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ropas)
}

// HandleGetROPA handles GET /api/v1/gdpr/ropa/{id}
func (s *ApiServer) HandleGetROPA(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	ropaID := vars["id"]

	ropa, err := s.store.GetROPAByID(r.Context(), ropaID)
	if err != nil {
		http.Error(w, "ROPA not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ropa)
}

// HandleUpdateROPA handles PUT /api/v1/gdpr/ropa/{id}
func (s *ApiServer) HandleUpdateROPA(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	ropaID := vars["id"]

	var req UpdateROPARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ropa, err := s.store.UpdateROPA(r.Context(), ropaID, req)
	if err != nil {
		log.Printf("Error updating ROPA: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log ROPA update
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{}
	if req.ActivityName != nil {
		changes["activity_name"] = *req.ActivityName
	}
	if req.Status != nil {
		changes["status"] = *req.Status
	}
	entityType := "gdpr_ropa"
	s.store.LogAudit(r.Context(), &userID, "ROPA_UPDATED", &entityType, &ropaID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ropa)
}

// HandleArchiveROPA handles DELETE /api/v1/gdpr/ropa/{id}
func (s *ApiServer) HandleArchiveROPA(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	ropaID := vars["id"]

	err := s.store.ArchiveROPA(r.Context(), ropaID)
	if err != nil {
		log.Printf("Error archiving ROPA: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log ROPA archival
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"status": "archived",
	}
	entityType := "gdpr_ropa"
	s.store.LogAudit(r.Context(), &userID, "ROPA_ARCHIVED", &entityType, &ropaID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "archived"})
}

// ========== RISK ASSESSMENT HANDLERS ==========

// HandleCreateRisk handles POST /api/v1/risks
func (s *ApiServer) HandleCreateRisk(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req CreateRiskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.Description == "" || req.Likelihood < 1 || req.Likelihood > 5 || req.Impact < 1 || req.Impact > 5 {
		http.Error(w, "Missing or invalid required fields", http.StatusBadRequest)
		return
	}

	risk, err := s.store.CreateRisk(r.Context(), req)
	if err != nil {
		log.Printf("Error creating risk: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log risk creation
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"title":      req.Title,
		"likelihood": req.Likelihood,
		"impact":     req.Impact,
		"risk_score": req.Likelihood * req.Impact,
	}
	entityType := "risk_assessment"
	s.store.LogAudit(r.Context(), &userID, "RISK_CREATED", &entityType, &risk.ID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(risk)
}

// HandleGetRisks handles GET /api/v1/risks
func (s *ApiServer) HandleGetRisks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	risks, err := s.store.GetRisks(r.Context())
	if err != nil {
		log.Printf("Error getting risks: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(risks)
}

// HandleGetRisk handles GET /api/v1/risks/{id}
func (s *ApiServer) HandleGetRisk(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	riskID := vars["id"]

	risk, err := s.store.GetRiskByID(r.Context(), riskID)
	if err != nil {
		http.Error(w, "Risk not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(risk)
}

// HandleUpdateRisk handles PUT /api/v1/risks/{id}
func (s *ApiServer) HandleUpdateRisk(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	riskID := vars["id"]

	var req UpdateRiskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	risk, err := s.store.UpdateRisk(r.Context(), riskID, req)
	if err != nil {
		log.Printf("Error updating risk: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log risk update
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{}
	if req.Title != nil {
		changes["title"] = *req.Title
	}
	if req.Likelihood != nil || req.Impact != nil {
		changes["likelihood"] = risk.Likelihood
		changes["impact"] = risk.Impact
		changes["risk_score"] = risk.RiskScore
	}
	if req.Status != nil {
		changes["status"] = *req.Status
	}
	entityType := "risk_assessment"
	s.store.LogAudit(r.Context(), &userID, "RISK_UPDATED", &entityType, &riskID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(risk)
}

// HandleDeleteRisk handles DELETE /api/v1/risks/{id}
func (s *ApiServer) HandleDeleteRisk(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	riskID := vars["id"]

	err := s.store.DeleteRisk(r.Context(), riskID)
	if err != nil {
		log.Printf("Error deleting risk: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log risk deletion
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{}
	entityType := "risk_assessment"
	s.store.LogAudit(r.Context(), &userID, "RISK_DELETED", &entityType, &riskID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// HandleGetRiskControls handles GET /api/v1/risks/{id}/controls
func (s *ApiServer) HandleGetRiskControls(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	riskID := vars["id"]

	controls, err := s.store.GetRiskControls(r.Context(), riskID)
	if err != nil {
		log.Printf("Error getting risk controls: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(controls)
}

// HandleCreateRiskControlMapping handles POST /api/v1/mappings/risk-to-control
func (s *ApiServer) HandleCreateRiskControlMapping(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		RiskID    string `json:"risk_id"`
		ControlID string `json:"control_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.RiskID == "" || req.ControlID == "" {
		http.Error(w, "risk_id and control_id are required", http.StatusBadRequest)
		return
	}

	err := s.store.CreateRiskControlMapping(r.Context(), req.RiskID, req.ControlID)
	if err != nil {
		log.Printf("Error creating risk-control mapping: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log mapping creation
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"risk_id":    req.RiskID,
		"control_id": req.ControlID,
	}
	entityType := "risk_control_mapping"
	s.store.LogAudit(r.Context(), &userID, "RISK_CONTROL_MAPPED", &entityType, nil, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "created"})
}

// HandleDeleteRiskControlMapping handles DELETE /api/v1/mappings/risk-to-control
func (s *ApiServer) HandleDeleteRiskControlMapping(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		RiskID    string `json:"risk_id"`
		ControlID string `json:"control_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err := s.store.DeleteRiskControlMapping(r.Context(), req.RiskID, req.ControlID)
	if err != nil {
		log.Printf("Error deleting risk-control mapping: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log mapping deletion
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{
		"risk_id":    req.RiskID,
		"control_id": req.ControlID,
	}
	entityType := "risk_control_mapping"
	s.store.LogAudit(r.Context(), &userID, "RISK_CONTROL_UNMAPPED", &entityType, nil, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// ========== GDPR DSR HANDLERS ==========

// HandleCreateDSR handles POST /api/v1/gdpr/dsr (admin) and public submission via /api/v1/gdpr/dsr/public
func (s *ApiServer) HandleCreateDSR(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var req CreateDSRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.RequestType == "" || req.RequesterName == "" || req.RequesterEmail == "" || req.DataSubjectInfo == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}
	if req.Priority == "" {
		req.Priority = "normal"
	}

	dsr, err := s.store.CreateDSR(r.Context(), req)
	if err != nil {
		log.Printf("Error creating DSR: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log DSR creation (if authenticated)
	if userID, ok := r.Context().Value(UserIDKey).(string); ok && userID != "" {
		changes := map[string]interface{}{
			"request_type": req.RequestType,
			"priority":     req.Priority,
			"deadline":     dsr.DeadlineDate,
		}
		entityType := "gdpr_dsr"
		s.store.LogAudit(r.Context(), &userID, "DSR_CREATED", &entityType, &dsr.ID, changes, nil)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(dsr)
}

// HandleGetDSRs handles GET /api/v1/gdpr/dsr
func (s *ApiServer) HandleGetDSRs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	dsrs, err := s.store.GetDSRs(r.Context())
	if err != nil {
		log.Printf("Error getting DSRs: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dsrs)
}

// HandleGetDSR handles GET /api/v1/gdpr/dsr/{id}
func (s *ApiServer) HandleGetDSR(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	dsrID := vars["id"]

	dsr, err := s.store.GetDSRByID(r.Context(), dsrID)
	if err != nil {
		http.Error(w, "DSR not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dsr)
}

// HandleUpdateDSR handles PUT /api/v1/gdpr/dsr/{id}
func (s *ApiServer) HandleUpdateDSR(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	dsrID := vars["id"]

	var req UpdateDSRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	dsr, err := s.store.UpdateDSR(r.Context(), dsrID, req)
	if err != nil {
		log.Printf("Error updating DSR: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log DSR update
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{}
	if req.Status != nil {
		changes["status"] = *req.Status
	}
	if req.Priority != nil {
		changes["priority"] = *req.Priority
	}
	entityType := "gdpr_dsr"
	s.store.LogAudit(r.Context(), &userID, "DSR_UPDATED", &entityType, &dsrID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dsr)
}

// HandleCompleteDSR handles PUT /api/v1/gdpr/dsr/{id}/complete
func (s *ApiServer) HandleCompleteDSR(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	dsrID := vars["id"]

	var body struct {
		ResponseSummary string `json:"response_summary"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ResponseSummary == "" {
		http.Error(w, "response_summary is required", http.StatusBadRequest)
		return
	}

	dsr, err := s.store.CompleteDSR(r.Context(), dsrID, body.ResponseSummary)
	if err != nil {
		log.Printf("Error completing DSR: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Log DSR completion
	userID := r.Context().Value(UserIDKey).(string)
	changes := map[string]interface{}{"status": "completed"}
	entityType := "gdpr_dsr"
	s.store.LogAudit(r.Context(), &userID, "DSR_COMPLETED", &entityType, &dsrID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dsr)
}

// ========== ANALYTICS & REPORTING HANDLERS ==========

// HandleGetControlComplianceTrends handles GET /api/v1/analytics/control-compliance-trends
func (s *ApiServer) HandleGetControlComplianceTrends(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Get date range from query params
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	// Default to last 30 days if not provided
	if startDate == "" {
		startDate = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if endDate == "" {
		endDate = time.Now().Format("2006-01-02")
	}

	trends, err := s.store.GetControlComplianceTrends(r.Context(), startDate, endDate)
	if err != nil {
		log.Printf("Error getting control compliance trends: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trends)
}

// HandleGetRiskDistribution handles GET /api/v1/analytics/risk-distribution
func (s *ApiServer) HandleGetRiskDistribution(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	distribution, err := s.store.GetRiskDistribution(r.Context())
	if err != nil {
		log.Printf("Error getting risk distribution: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(distribution)
}

// HandleGetRiskTrends handles GET /api/v1/analytics/risk-trends
func (s *ApiServer) HandleGetRiskTrends(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	// Get months from query param (default 6)
	months := 6
	if monthsParam := r.URL.Query().Get("months"); monthsParam != "" {
		if m, err := strconv.Atoi(monthsParam); err == nil && m > 0 && m <= 24 {
			months = m
		}
	}

	trends, err := s.store.GetRiskTrends(r.Context(), months)
	if err != nil {
		log.Printf("Error getting risk trends: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trends)
}

// HandleGetDSRMetrics handles GET /api/v1/analytics/dsr-metrics
func (s *ApiServer) HandleGetDSRMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	metrics, err := s.store.GetDSRMetrics(r.Context())
	if err != nil {
		log.Printf("Error getting DSR metrics: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// HandleGetAssetBreakdown handles GET /api/v1/analytics/asset-breakdown
func (s *ApiServer) HandleGetAssetBreakdown(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	breakdown, err := s.store.GetAssetBreakdown(r.Context())
	if err != nil {
		log.Printf("Error getting asset breakdown: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(breakdown)
}

// HandleGetROPAMetrics handles GET /api/v1/analytics/ropa-metrics
func (s *ApiServer) HandleGetROPAMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	metrics, err := s.store.GetROPAMetrics(r.Context())
	if err != nil {
		log.Printf("Error getting ROPA metrics: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// Vendor Handlers

func (s *ApiServer) HandleCreateVendor(w http.ResponseWriter, r *http.Request) {
	var vendor Vendor
	if err := json.NewDecoder(r.Body).Decode(&vendor); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if vendor.Name == "" || vendor.Category == "" {
		http.Error(w, "Name and category are required", http.StatusBadRequest)
		return
	}

	if vendor.RiskTier == "" {
		vendor.RiskTier = "medium"
	}
	if vendor.Status == "" {
		vendor.Status = "active"
	}

	userID := r.Context().Value(UserIDKey).(string)
	if err := s.store.CreateVendor(r.Context(), &vendor); err != nil {
		http.Error(w, "Failed to create vendor", http.StatusInternalServerError)
		return
	}

	entityType := "vendor"
	changes := map[string]interface{}{"vendor_id": vendor.ID, "name": vendor.Name, "category": vendor.Category}
	s.store.LogAudit(r.Context(), &userID, "VENDOR_CREATED", &entityType, &vendor.ID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(vendor)
}

func (s *ApiServer) HandleGetVendors(w http.ResponseWriter, r *http.Request) {
	vendors, err := s.store.GetVendors(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch vendors", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vendors)
}

func (s *ApiServer) HandleGetVendor(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	vendor, err := s.store.GetVendorByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Vendor not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vendor)
}

func (s *ApiServer) HandleUpdateVendor(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.store.UpdateVendor(r.Context(), id, updates); err != nil {
		http.Error(w, "Failed to update vendor", http.StatusInternalServerError)
		return
	}

	userID := r.Context().Value(UserIDKey).(string)
	entityType := "vendor"
	s.store.LogAudit(r.Context(), &userID, "VENDOR_UPDATED", &entityType, &id, updates, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func (s *ApiServer) HandleDeleteVendor(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if err := s.store.DeleteVendor(r.Context(), id); err != nil {
		http.Error(w, "Failed to delete vendor", http.StatusInternalServerError)
		return
	}

	userID := r.Context().Value(UserIDKey).(string)
	entityType := "vendor"
	s.store.LogAudit(r.Context(), &userID, "VENDOR_DELETED", &entityType, &id, nil, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

func (s *ApiServer) HandleCreateVendorAssessment(w http.ResponseWriter, r *http.Request) {
	var assessment VendorAssessment
	if err := json.NewDecoder(r.Body).Decode(&assessment); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if assessment.VendorID == "" {
		http.Error(w, "Vendor ID is required", http.StatusBadRequest)
		return
	}

	if assessment.Status == "" {
		assessment.Status = "draft"
	}
	if assessment.AssessmentDate.IsZero() {
		assessment.AssessmentDate = time.Now()
	}

	userID := r.Context().Value(UserIDKey).(string)
	if assessment.AssessorID == nil {
		assessment.AssessorID = &userID
	}

	if err := s.store.CreateVendorAssessment(r.Context(), &assessment); err != nil {
		http.Error(w, "Failed to create vendor assessment", http.StatusInternalServerError)
		return
	}

	entityType := "vendor_assessment"
	changes := map[string]interface{}{"assessment_id": assessment.ID, "vendor_id": assessment.VendorID, "status": assessment.Status}
	s.store.LogAudit(r.Context(), &userID, "VENDOR_ASSESSMENT_CREATED", &entityType, &assessment.ID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(assessment)
}

func (s *ApiServer) HandleGetVendorAssessments(w http.ResponseWriter, r *http.Request) {
	vendorID := mux.Vars(r)["id"]
	assessments, err := s.store.GetVendorAssessments(r.Context(), vendorID)
	if err != nil {
		http.Error(w, "Failed to fetch vendor assessments", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(assessments)
}

func (s *ApiServer) HandleGetVendorControls(w http.ResponseWriter, r *http.Request) {
	vendorID := mux.Vars(r)["id"]
	controls, err := s.store.GetVendorControls(r.Context(), vendorID)
	if err != nil {
		http.Error(w, "Failed to fetch vendor controls", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(controls)
}

func (s *ApiServer) HandleCreateVendorControlMapping(w http.ResponseWriter, r *http.Request) {
	var mapping struct {
		VendorID  string `json:"vendor_id"`
		ControlID string `json:"activated_control_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&mapping); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.store.CreateVendorControlMapping(r.Context(), mapping.VendorID, mapping.ControlID); err != nil {
		http.Error(w, "Failed to create mapping", http.StatusInternalServerError)
		return
	}

	userID := r.Context().Value(UserIDKey).(string)
	entityType := "vendor"
	changes := map[string]interface{}{"vendor_id": mapping.VendorID, "control_id": mapping.ControlID}
	s.store.LogAudit(r.Context(), &userID, "VENDOR_CONTROL_MAPPED", &entityType, &mapping.VendorID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "created"})
}

func (s *ApiServer) HandleDeleteVendorControlMapping(w http.ResponseWriter, r *http.Request) {
	var mapping struct {
		VendorID  string `json:"vendor_id"`
		ControlID string `json:"activated_control_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&mapping); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.store.DeleteVendorControlMapping(r.Context(), mapping.VendorID, mapping.ControlID); err != nil {
		http.Error(w, "Failed to delete mapping", http.StatusInternalServerError)
		return
	}

	userID := r.Context().Value(UserIDKey).(string)
	entityType := "vendor"
	changes := map[string]interface{}{"vendor_id": mapping.VendorID, "control_id": mapping.ControlID}
	s.store.LogAudit(r.Context(), &userID, "VENDOR_CONTROL_UNMAPPED", &entityType, &mapping.VendorID, changes, nil)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}
