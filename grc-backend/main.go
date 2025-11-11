package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// Load environment variables
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	// Connect to database
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	// Test database connection
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("Unable to ping database: %v", err)
	}

	fmt.Println("Connected to database successfully")

	// Seed the database with CIS controls
	if err := SeedControlLibrary(context.Background(), pool); err != nil {
		log.Fatalf("Failed to seed control library: %v", err)
	}

	// Initialize store
	store := NewStore(pool)

	// Initialize cron service
	cronService := NewCronService(store)
	cronService.Start()

	// Initialize API server
	apiServer := NewApiServer(store)

	// Setup routes
	r := mux.NewRouter()

	// Add CORS middleware
	r.Use(corsMiddleware)

	// API routes
	api := r.PathPrefix("/api/v1").Subrouter()

	// Public routes (no auth required)
	api.HandleFunc("/auth/login", apiServer.HandleLogin).Methods("POST", "OPTIONS")
	api.HandleFunc("/tickets/external", apiServer.HandleCreateExternalTicket).Methods("POST", "OPTIONS")
	api.HandleFunc("/tickets/external/{customerRef}", apiServer.HandleGetTicketsByCustomerRef).Methods("GET", "OPTIONS")
	api.HandleFunc("/gdpr/dsr/public", apiServer.HandleCreateDSR).Methods("POST", "OPTIONS") // Public DSR submission

	// Protected routes (auth required) - create a subrouter with auth middleware
	protected := api.PathPrefix("").Subrouter()
	protected.Use(AuthMiddleware)

	// Admin-only routes
	admin := protected.PathPrefix("").Subrouter()
	admin.Use(AdminOnly)
	admin.HandleFunc("/audit/logs", apiServer.HandleGetAuditLogs).Methods("GET", "OPTIONS")
	admin.HandleFunc("/controls/activated", apiServer.HandleActivatedControls).Methods("POST", "OPTIONS") // Only POST is admin
	admin.HandleFunc("/controls/activated/{id}", apiServer.HandleSpecificActivatedControl).Methods("PUT", "DELETE")
	admin.HandleFunc("/tickets/{id}", apiServer.HandleUpdateTicket).Methods("PUT", "OPTIONS")

	// User routes (authenticated users)
	protected.HandleFunc("/dashboard/summary", apiServer.HandleDashboardSummary).Methods("GET", "OPTIONS")
	protected.HandleFunc("/notifications", apiServer.HandleGetNotifications).Methods("GET", "OPTIONS")
	protected.HandleFunc("/notifications/{id}/read", apiServer.HandleMarkNotificationAsRead).Methods("POST", "OPTIONS")
	protected.HandleFunc("/controls/library", apiServer.HandleGetControlLibrary).Methods("GET", "OPTIONS")
	protected.HandleFunc("/controls/library/export", apiServer.HandleExportControls).Methods("GET", "OPTIONS") // Export controls
	protected.HandleFunc("/controls/activated", apiServer.HandleActivatedControls).Methods("GET", "OPTIONS")
	protected.HandleFunc("/controls/activated/{id}", apiServer.HandleSpecificActivatedControl).Methods("GET", "OPTIONS") // GET is for all users

	// Admin-only Control Library Management routes
	admin.HandleFunc("/controls/library", apiServer.HandleCreateControlLibraryItem).Methods("POST", "OPTIONS")
	admin.HandleFunc("/controls/library/import", apiServer.HandleImportControls).Methods("POST", "OPTIONS")
	admin.HandleFunc("/controls/library/{id}", apiServer.HandleUpdateControlLibraryItem).Methods("PUT", "OPTIONS")
	admin.HandleFunc("/controls/library/{id}", apiServer.HandleDeleteControlLibraryItem).Methods("DELETE", "OPTIONS")
	protected.HandleFunc("/tickets/internal", apiServer.HandleCreateInternalTicket).Methods("POST", "OPTIONS")
	protected.HandleFunc("/tickets", apiServer.HandleGetTickets).Methods("GET", "OPTIONS")
	protected.HandleFunc("/tickets/{id}", apiServer.HandleGetTicket).Methods("GET", "OPTIONS")
	protected.HandleFunc("/tickets/{id}/comments", apiServer.HandleAddTicketComment).Methods("POST", "OPTIONS")
	protected.HandleFunc("/assets", apiServer.HandleGetAssets).Methods("GET", "OPTIONS")
	protected.HandleFunc("/assets", apiServer.HandleCreateAsset).Methods("POST", "OPTIONS")
	protected.HandleFunc("/assets/{id}", apiServer.HandleGetAsset).Methods("GET", "OPTIONS")
	protected.HandleFunc("/assets/{id}", apiServer.HandleUpdateAsset).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/assets/{id}", apiServer.HandleDeleteAsset).Methods("DELETE", "OPTIONS")
	protected.HandleFunc("/assets/{id}/controls", apiServer.HandleGetAssetControlMappings).Methods("GET", "OPTIONS")
	protected.HandleFunc("/mappings/asset-to-control", apiServer.HandleCreateAssetControlMapping).Methods("POST", "OPTIONS")
	protected.HandleFunc("/mappings/asset-to-control", apiServer.HandleDeleteAssetControlMapping).Methods("DELETE", "OPTIONS")

	// Document routes
	protected.HandleFunc("/documents", apiServer.HandleGetDocuments).Methods("GET", "OPTIONS")
	protected.HandleFunc("/documents/{id}", apiServer.HandleGetDocument).Methods("GET", "OPTIONS")
	protected.HandleFunc("/versions/{id}/acknowledge", apiServer.HandleAcknowledgeDocument).Methods("POST", "OPTIONS")

	// Admin-only document routes
	admin.HandleFunc("/documents", apiServer.HandleCreateDocument).Methods("POST", "OPTIONS")
	admin.HandleFunc("/documents/{id}/versions", apiServer.HandleCreateDocumentVersion).Methods("POST", "OPTIONS")
	admin.HandleFunc("/documents/{doc_id}/versions/{version_id}/publish", apiServer.HandlePublishDocumentVersion).Methods("PUT", "OPTIONS")
	admin.HandleFunc("/mappings/document-to-control", apiServer.HandleCreateDocumentControlMapping).Methods("POST", "OPTIONS")
	admin.HandleFunc("/mappings/document-to-control", apiServer.HandleDeleteDocumentControlMapping).Methods("DELETE", "OPTIONS")

	// GDPR ROPA routes
	protected.HandleFunc("/gdpr/ropa", apiServer.HandleGetROPAs).Methods("GET", "OPTIONS")
	protected.HandleFunc("/gdpr/ropa/{id}", apiServer.HandleGetROPA).Methods("GET", "OPTIONS")

	// Admin-only GDPR ROPA routes
	admin.HandleFunc("/gdpr/ropa", apiServer.HandleCreateROPA).Methods("POST", "OPTIONS")
	admin.HandleFunc("/gdpr/ropa/{id}", apiServer.HandleUpdateROPA).Methods("PUT", "OPTIONS")
	admin.HandleFunc("/gdpr/ropa/{id}", apiServer.HandleArchiveROPA).Methods("DELETE", "OPTIONS")

	// Risk Assessment routes
	protected.HandleFunc("/risks", apiServer.HandleGetRisks).Methods("GET", "OPTIONS")
	protected.HandleFunc("/risks/{id}", apiServer.HandleGetRisk).Methods("GET", "OPTIONS")
	protected.HandleFunc("/risks/{id}/controls", apiServer.HandleGetRiskControls).Methods("GET", "OPTIONS")

	// Admin-only Risk Assessment routes
	admin.HandleFunc("/risks", apiServer.HandleCreateRisk).Methods("POST", "OPTIONS")
	admin.HandleFunc("/risks/{id}", apiServer.HandleUpdateRisk).Methods("PUT", "OPTIONS")
	admin.HandleFunc("/risks/{id}", apiServer.HandleDeleteRisk).Methods("DELETE", "OPTIONS")
	admin.HandleFunc("/mappings/risk-to-control", apiServer.HandleCreateRiskControlMapping).Methods("POST", "OPTIONS")
	admin.HandleFunc("/mappings/risk-to-control", apiServer.HandleDeleteRiskControlMapping).Methods("DELETE", "OPTIONS")

	// GDPR DSR routes
	protected.HandleFunc("/gdpr/dsr", apiServer.HandleGetDSRs).Methods("GET", "OPTIONS")
	protected.HandleFunc("/gdpr/dsr/{id}", apiServer.HandleGetDSR).Methods("GET", "OPTIONS")

	// Admin-only GDPR DSR routes
	admin.HandleFunc("/gdpr/dsr", apiServer.HandleCreateDSR).Methods("POST", "OPTIONS")
	admin.HandleFunc("/gdpr/dsr/{id}", apiServer.HandleUpdateDSR).Methods("PUT", "OPTIONS")
	admin.HandleFunc("/gdpr/dsr/{id}/complete", apiServer.HandleCompleteDSR).Methods("PUT", "OPTIONS")

	// Analytics & Reporting routes (all authenticated users)
	protected.HandleFunc("/analytics/control-compliance-trends", apiServer.HandleGetControlComplianceTrends).Methods("GET", "OPTIONS")
	protected.HandleFunc("/analytics/risk-distribution", apiServer.HandleGetRiskDistribution).Methods("GET", "OPTIONS")
	protected.HandleFunc("/analytics/risk-trends", apiServer.HandleGetRiskTrends).Methods("GET", "OPTIONS")
	protected.HandleFunc("/analytics/dsr-metrics", apiServer.HandleGetDSRMetrics).Methods("GET", "OPTIONS")
	protected.HandleFunc("/analytics/asset-breakdown", apiServer.HandleGetAssetBreakdown).Methods("GET", "OPTIONS")
	protected.HandleFunc("/analytics/ropa-metrics", apiServer.HandleGetROPAMetrics).Methods("GET", "OPTIONS")

	// Vendor Management routes
	protected.HandleFunc("/vendors", apiServer.HandleGetVendors).Methods("GET", "OPTIONS")
	protected.HandleFunc("/vendors/{id}", apiServer.HandleGetVendor).Methods("GET", "OPTIONS")
	protected.HandleFunc("/vendors/{id}/assessments", apiServer.HandleGetVendorAssessments).Methods("GET", "OPTIONS")
	protected.HandleFunc("/vendors/{id}/controls", apiServer.HandleGetVendorControls).Methods("GET", "OPTIONS")

	// Admin-only Vendor routes
	admin.HandleFunc("/vendors", apiServer.HandleCreateVendor).Methods("POST", "OPTIONS")
	admin.HandleFunc("/vendors/{id}", apiServer.HandleUpdateVendor).Methods("PUT", "OPTIONS")
	admin.HandleFunc("/vendors/{id}", apiServer.HandleDeleteVendor).Methods("DELETE", "OPTIONS")
	admin.HandleFunc("/vendors/{id}/assessments", apiServer.HandleCreateVendorAssessment).Methods("POST", "OPTIONS")
	admin.HandleFunc("/mappings/vendor-to-control", apiServer.HandleCreateVendorControlMapping).Methods("POST", "OPTIONS")
	admin.HandleFunc("/mappings/vendor-to-control", apiServer.HandleDeleteVendorControlMapping).Methods("DELETE", "OPTIONS")

	// Standards Management routes (all authenticated users can view)
	protected.HandleFunc("/standards", apiServer.HandleGetStandards).Methods("GET", "OPTIONS")
	protected.HandleFunc("/standards/{id}", apiServer.HandleGetStandardByID).Methods("GET", "OPTIONS")
	protected.HandleFunc("/standards/{id}/controls", apiServer.HandleGetControlsByStandard).Methods("GET", "OPTIONS")
	protected.HandleFunc("/controls/{id}/article", apiServer.HandleGetArticleByControlID).Methods("GET", "OPTIONS")

	// Admin-only Standards routes
	admin.HandleFunc("/standards/import", apiServer.HandleImportStandard).Methods("POST", "OPTIONS")

	// Start server
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
