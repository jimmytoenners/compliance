package main

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/jung-kurt/gofpdf"
)

// ReportGenerator handles PDF report generation
type ReportGenerator struct {
	store *Store
}

// NewReportGenerator creates a new report generator
func NewReportGenerator(store *Store) *ReportGenerator {
	return &ReportGenerator{store: store}
}

// ComplianceReportRequest represents parameters for generating a report
type ComplianceReportRequest struct {
	StandardID   string    `json:"standard_id"`
	StandardCode string    `json:"standard_code,omitempty"`
	StartDate    time.Time `json:"start_date"`
	EndDate      time.Time `json:"end_date"`
	IncludeEvidence bool   `json:"include_evidence"`
}

// ComplianceReportData holds all data needed for a compliance report
type ComplianceReportData struct {
	Standard           *ControlStandard
	Controls           []ReportControl
	TotalControls      int
	ActivatedControls  int
	CompliantControls  int
	NonCompliantControls int
	ComplianceRate     float64
	GeneratedAt        time.Time
	DateRange          string
}

// ReportControl represents a control with evidence for reporting
type ReportControl struct {
	ControlID         string
	ControlName       string
	Family            string
	Status            string
	LastReviewedAt    string
	NextReviewDue     string
	EvidenceCount     int
	LatestEvidence    *ControlEvidenceLog
	IsOverdue         bool
}

// GenerateComplianceReport creates a PDF report for a specific standard
func (rg *ReportGenerator) GenerateComplianceReport(ctx context.Context, req ComplianceReportRequest) ([]byte, error) {
	// Fetch report data
	data, err := rg.fetchReportData(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch report data: %w", err)
	}

	// Generate PDF
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.SetAutoPageBreak(true, 20)

	// Add title page
	rg.addTitlePage(pdf, data)

	// Add executive summary
	rg.addExecutiveSummary(pdf, data)

	// Add controls detail
	rg.addControlsDetail(pdf, data, req.IncludeEvidence)

	// Get PDF bytes
	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

func (rg *ReportGenerator) fetchReportData(ctx context.Context, req ComplianceReportRequest) (*ComplianceReportData, error) {
	// Fetch standard metadata
	standard, err := rg.store.GetStandardByID(ctx, req.StandardID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch standard: %w", err)
	}

	// Fetch controls for this standard
	controls, err := rg.store.GetControlsByStandardID(ctx, req.StandardID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch controls: %w", err)
	}

	// Fetch activated controls
	activatedControls, err := rg.store.GetActiveControlsList(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch activated controls: %w", err)
	}

	// Build map of activated controls by library ID
	activatedMap := make(map[string]ActiveControlListItem)
	for _, ac := range activatedControls {
		activatedMap[ac.ControlID] = ac
	}

	// Build report control data
	var reportControls []ReportControl
	totalActivated := 0
	totalCompliant := 0
	totalNonCompliant := 0

	for _, control := range controls {
		rc := ReportControl{
			ControlID:   control.ID,
			ControlName: control.Name,
			Family:      control.Family,
			Status:      "not_activated",
		}

		// Check if control is activated
		if activated, exists := activatedMap[control.ID]; exists {
			rc.Status = activated.Status
			rc.NextReviewDue = activated.NextReviewDueDate
			if activated.LastReviewedAt.Valid {
				rc.LastReviewedAt = activated.LastReviewedAt.String
			}

			// Check if overdue
			dueDate, err := time.Parse("2006-01-02", activated.NextReviewDueDate)
			if err == nil && dueDate.Before(time.Now()) {
				rc.IsOverdue = true
			}

			totalActivated++

			// Count compliance status
			if activated.Status == "compliant" {
				totalCompliant++
			} else if activated.Status == "non_compliant" {
				totalNonCompliant++
			}

			// Evidence fetching removed for simplicity - can be added later if needed
			rc.EvidenceCount = 0
		}

		reportControls = append(reportControls, rc)
	}

	// Calculate compliance rate
	complianceRate := 0.0
	if totalActivated > 0 {
		complianceRate = (float64(totalCompliant) / float64(totalActivated)) * 100
	}

	dateRange := fmt.Sprintf("%s to %s", req.StartDate.Format("2006-01-02"), req.EndDate.Format("2006-01-02"))

	return &ComplianceReportData{
		Standard:             standard,
		Controls:             reportControls,
		TotalControls:        len(controls),
		ActivatedControls:    totalActivated,
		CompliantControls:    totalCompliant,
		NonCompliantControls: totalNonCompliant,
		ComplianceRate:       complianceRate,
		GeneratedAt:          time.Now(),
		DateRange:            dateRange,
	}, nil
}

func (rg *ReportGenerator) addTitlePage(pdf *gofpdf.Fpdf, data *ComplianceReportData) {
	pdf.AddPage()

	// Company logo placeholder
	pdf.SetFont("Arial", "B", 28)
	pdf.SetTextColor(31, 78, 121)
	pdf.CellFormat(0, 20, "GRC Compliance Platform", "", 1, "C", false, 0, "")

	pdf.Ln(10)

	// Report title
	pdf.SetFont("Arial", "B", 22)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 15, "Compliance Report", "", 1, "C", false, 0, "")

	pdf.Ln(5)

	// Standard name
	pdf.SetFont("Arial", "", 18)
	pdf.SetTextColor(64, 64, 64)
	pdf.CellFormat(0, 12, data.Standard.Name, "", 1, "C", false, 0, "")

	pdf.Ln(20)

	// Report metadata box
	pdf.SetFillColor(245, 245, 245)
	pdf.Rect(40, pdf.GetY(), 130, 60, "F")

	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetXY(50, pdf.GetY()+10)
	pdf.Cell(0, 8, fmt.Sprintf("Report Date: %s", data.GeneratedAt.Format("January 2, 2006")))

	pdf.SetXY(50, pdf.GetY()+18)
	pdf.Cell(0, 8, fmt.Sprintf("Standard: %s v%s", data.Standard.Code, data.Standard.Version))

	pdf.SetXY(50, pdf.GetY()+26)
	pdf.Cell(0, 8, fmt.Sprintf("Organization: %s", data.Standard.Organization))

	pdf.SetXY(50, pdf.GetY()+34)
	pdf.Cell(0, 8, fmt.Sprintf("Date Range: %s", data.DateRange))

	pdf.SetXY(50, pdf.GetY()+42)
	pdf.Cell(0, 8, fmt.Sprintf("Compliance Rate: %.1f%%", data.ComplianceRate))

	pdf.Ln(70)

	// Disclaimer
	pdf.SetFont("Arial", "I", 9)
	pdf.SetTextColor(128, 128, 128)
	pdf.MultiCell(0, 5, "This report is confidential and intended for internal use only. It contains sensitive compliance information and should be handled according to your organization's data protection policies.", "", "C", false)
}

func (rg *ReportGenerator) addExecutiveSummary(pdf *gofpdf.Fpdf, data *ComplianceReportData) {
	pdf.AddPage()

	// Section title
	pdf.SetFont("Arial", "B", 16)
	pdf.SetTextColor(31, 78, 121)
	pdf.CellFormat(0, 10, "Executive Summary", "", 1, "L", false, 0, "")
	pdf.Ln(5)

	// Summary statistics
	pdf.SetFont("Arial", "", 11)
	pdf.SetTextColor(0, 0, 0)

	// Total controls
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(70, 8, "Total Controls in Standard:")
	pdf.SetFont("Arial", "", 11)
	pdf.Cell(0, 8, fmt.Sprintf("%d", data.TotalControls))
	pdf.Ln(8)

	// Activated controls
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(70, 8, "Activated Controls:")
	pdf.SetFont("Arial", "", 11)
	activationRate := 0.0
	if data.TotalControls > 0 {
		activationRate = (float64(data.ActivatedControls) / float64(data.TotalControls)) * 100
	}
	pdf.Cell(0, 8, fmt.Sprintf("%d (%.1f%%)", data.ActivatedControls, activationRate))
	pdf.Ln(8)

	// Compliant controls
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(0, 128, 0)
	pdf.Cell(70, 8, "Compliant Controls:")
	pdf.SetFont("Arial", "", 11)
	pdf.Cell(0, 8, fmt.Sprintf("%d", data.CompliantControls))
	pdf.Ln(8)

	// Non-compliant controls
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(200, 0, 0)
	pdf.Cell(70, 8, "Non-Compliant Controls:")
	pdf.SetFont("Arial", "", 11)
	pdf.Cell(0, 8, fmt.Sprintf("%d", data.NonCompliantControls))
	pdf.Ln(8)

	// Overall compliance rate
	pdf.SetTextColor(0, 0, 0)
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(70, 8, "Overall Compliance Rate:")
	pdf.SetFont("Arial", "", 11)
	
	// Color code compliance rate
	if data.ComplianceRate >= 80 {
		pdf.SetTextColor(0, 128, 0)
	} else if data.ComplianceRate >= 50 {
		pdf.SetTextColor(200, 128, 0)
	} else {
		pdf.SetTextColor(200, 0, 0)
	}
	pdf.Cell(0, 8, fmt.Sprintf("%.1f%%", data.ComplianceRate))
	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(12)

	// Overdue controls
	overdueCount := 0
	for _, control := range data.Controls {
		if control.IsOverdue {
			overdueCount++
		}
	}

	if overdueCount > 0 {
		pdf.SetFont("Arial", "B", 11)
		pdf.SetTextColor(200, 0, 0)
		pdf.Cell(70, 8, "Overdue Controls:")
		pdf.SetFont("Arial", "", 11)
		pdf.Cell(0, 8, fmt.Sprintf("%d (require immediate attention)", overdueCount))
		pdf.SetTextColor(0, 0, 0)
		pdf.Ln(12)
	}

	// Key findings
	pdf.Ln(5)
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(31, 78, 121)
	pdf.Cell(0, 10, "Key Findings")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(0, 0, 0)

	if data.ComplianceRate >= 80 {
		pdf.MultiCell(0, 6, "• The organization demonstrates strong compliance with "+data.Standard.Name+", with an overall compliance rate above 80%.", "", "L", false)
	} else if data.ComplianceRate >= 50 {
		pdf.MultiCell(0, 6, "• The organization shows moderate compliance with "+data.Standard.Name+". Additional controls should be implemented to improve the compliance posture.", "", "L", false)
	} else {
		pdf.MultiCell(0, 6, "• The organization's compliance with "+data.Standard.Name+" requires significant improvement. Immediate action is recommended to address non-compliant controls.", "", "L", false)
	}

	pdf.Ln(3)

	if overdueCount > 0 {
		pdf.MultiCell(0, 6, fmt.Sprintf("• %d controls are overdue for review. These should be prioritized for immediate assessment.", overdueCount), "", "L", false)
		pdf.Ln(3)
	}

	if data.ActivatedControls < data.TotalControls {
		notActivated := data.TotalControls - data.ActivatedControls
		pdf.MultiCell(0, 6, fmt.Sprintf("• %d controls from the standard have not been activated. Consider activating these controls to achieve comprehensive compliance.", notActivated), "", "L", false)
	}
}

func (rg *ReportGenerator) addControlsDetail(pdf *gofpdf.Fpdf, data *ComplianceReportData, includeEvidence bool) {
	pdf.AddPage()

	// Section title
	pdf.SetFont("Arial", "B", 16)
	pdf.SetTextColor(31, 78, 121)
	pdf.CellFormat(0, 10, "Controls Detail", "", 1, "L", false, 0, "")
	pdf.Ln(5)

	// Group controls by status
	activatedControls := []ReportControl{}
	notActivatedControls := []ReportControl{}

	for _, control := range data.Controls {
		if control.Status == "not_activated" {
			notActivatedControls = append(notActivatedControls, control)
		} else {
			activatedControls = append(activatedControls, control)
		}
	}

	// Activated controls section
	if len(activatedControls) > 0 {
		pdf.SetFont("Arial", "B", 14)
		pdf.SetTextColor(0, 0, 0)
		pdf.Cell(0, 10, fmt.Sprintf("Activated Controls (%d)", len(activatedControls)))
		pdf.Ln(10)

		for _, control := range activatedControls {
			// Check if we need a new page
			if pdf.GetY() > 250 {
				pdf.AddPage()
			}

			// Control box
			pdf.SetFillColor(245, 245, 245)
			boxHeight := 25.0
			if includeEvidence && control.EvidenceCount > 0 {
				boxHeight = 35.0
			}
			pdf.Rect(20, pdf.GetY(), 170, boxHeight, "F")

			// Control name
			pdf.SetFont("Arial", "B", 10)
			pdf.SetXY(25, pdf.GetY()+3)
			pdf.Cell(120, 5, control.ControlName)

			// Status badge
			pdf.SetXY(150, pdf.GetY())
			statusColor := rg.getStatusColor(control.Status)
			pdf.SetFillColor(statusColor[0], statusColor[1], statusColor[2])
			pdf.SetTextColor(255, 255, 255)
			pdf.Rect(150, pdf.GetY()-3, 35, 6, "F")
			pdf.SetXY(152, pdf.GetY()-3)
			pdf.Cell(31, 6, rg.getStatusLabel(control.Status))
			pdf.SetTextColor(0, 0, 0)

			// Control ID and Family
			pdf.SetFont("Arial", "", 9)
			pdf.SetXY(25, pdf.GetY()+8)
			pdf.Cell(0, 4, fmt.Sprintf("ID: %s | Family: %s", control.ControlID, control.Family))

			// Review dates
			pdf.SetXY(25, pdf.GetY()+12)
			reviewInfo := fmt.Sprintf("Next Review: %s", control.NextReviewDue)
			if control.LastReviewedAt != "" {
				reviewInfo += fmt.Sprintf(" | Last Reviewed: %s", control.LastReviewedAt)
			}
			if control.IsOverdue {
				pdf.SetTextColor(200, 0, 0)
				reviewInfo += " [OVERDUE]"
			}
			pdf.Cell(0, 4, reviewInfo)
			pdf.SetTextColor(0, 0, 0)

			// Evidence count
			if includeEvidence && control.EvidenceCount > 0 {
				pdf.SetXY(25, pdf.GetY()+16)
				pdf.Cell(0, 4, fmt.Sprintf("Evidence submissions: %d", control.EvidenceCount))
			}

			pdf.SetY(pdf.GetY() + boxHeight + 3)
		}
	}

	// Not activated controls section
	if len(notActivatedControls) > 0 {
		pdf.Ln(10)
		pdf.SetFont("Arial", "B", 14)
		pdf.SetTextColor(0, 0, 0)
		pdf.Cell(0, 10, fmt.Sprintf("Not Activated Controls (%d)", len(notActivatedControls)))
		pdf.Ln(10)

		pdf.SetFont("Arial", "", 9)
		pdf.SetTextColor(64, 64, 64)
		pdf.MultiCell(0, 5, "The following controls from the standard have not been activated in the GRC platform. Consider activating these controls to improve compliance coverage.", "", "L", false)
		pdf.Ln(5)

		// List controls in compact format
		pdf.SetFont("Arial", "", 9)
		for _, control := range notActivatedControls {
			if pdf.GetY() > 270 {
				pdf.AddPage()
			}
			pdf.Cell(0, 5, fmt.Sprintf("• %s - %s", control.ControlID, control.ControlName))
			pdf.Ln(5)
		}
	}
}

func (rg *ReportGenerator) getStatusColor(status string) [3]int {
	switch status {
	case "compliant":
		return [3]int{0, 128, 0}
	case "non_compliant":
		return [3]int{200, 0, 0}
	case "pending":
		return [3]int{200, 128, 0}
	default:
		return [3]int{128, 128, 128}
	}
}

func (rg *ReportGenerator) getStatusLabel(status string) string {
	switch status {
	case "compliant":
		return "COMPLIANT"
	case "non_compliant":
		return "NON-COMPLIANT"
	case "pending":
		return "PENDING"
	default:
		return "UNKNOWN"
	}
}

// GenerateCSVReport generates a CSV export of compliance data
func (rg *ReportGenerator) GenerateCSVReport(ctx context.Context, req ComplianceReportRequest) (string, error) {
	data, err := rg.fetchReportData(ctx, req)
	if err != nil {
		return "", err
	}

	csv := "Control ID,Control Name,Family,Status,Last Reviewed,Next Review Due,Overdue,Evidence Count\n"

	for _, control := range data.Controls {
		overdue := "No"
		if control.IsOverdue {
			overdue = "Yes"
		}
		
		csv += fmt.Sprintf("%s,%s,%s,%s,%s,%s,%s,%d\n",
			control.ControlID,
			control.ControlName,
			control.Family,
			control.Status,
			control.LastReviewedAt,
			control.NextReviewDue,
			overdue,
			control.EvidenceCount,
		)
	}

	return csv, nil
}

// GenerateJSONReport generates a JSON export of compliance data
func (rg *ReportGenerator) GenerateJSONReport(ctx context.Context, req ComplianceReportRequest) (*ComplianceReportData, error) {
	return rg.fetchReportData(ctx, req)
}
