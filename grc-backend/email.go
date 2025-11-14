package main

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"os"
	"time"
)

// EmailService handles sending emails via SMTP
type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
	fromEmail    string
	fromName     string
	enabled      bool
}

// NewEmailService creates a new email service from environment variables
func NewEmailService() *EmailService {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPassword := os.Getenv("SMTP_PASSWORD")
	fromEmail := os.Getenv("SMTP_FROM_EMAIL")
	fromName := os.Getenv("SMTP_FROM_NAME")

	// Check if SMTP is configured
	enabled := smtpHost != "" && smtpPort != "" && smtpUser != "" && smtpPassword != ""

	if !enabled {
		log.Println("Email service disabled - SMTP not configured")
	} else {
		log.Printf("Email service enabled - SMTP host: %s:%s", smtpHost, smtpPort)
	}

	if fromEmail == "" {
		fromEmail = smtpUser
	}
	if fromName == "" {
		fromName = "GRC Compliance Platform"
	}

	return &EmailService{
		smtpHost:     smtpHost,
		smtpPort:     smtpPort,
		smtpUser:     smtpUser,
		smtpPassword: smtpPassword,
		fromEmail:    fromEmail,
		fromName:     fromName,
		enabled:      enabled,
	}
}

// EmailData contains data for email templates
type EmailData struct {
	RecipientName string
	Subject       string
	PreheaderText string
	Title         string
	Body          string
	ActionURL     string
	ActionText    string
	FooterText    string
	Year          int
}

// SendEmail sends an HTML email
func (es *EmailService) SendEmail(to, subject, htmlBody string) error {
	if !es.enabled {
		log.Printf("Email not sent (SMTP disabled): to=%s, subject=%s", to, subject)
		return nil
	}

	// Compose message
	from := fmt.Sprintf("%s <%s>", es.fromName, es.fromEmail)
	headers := make(map[string]string)
	headers["From"] = from
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"
	headers["Date"] = time.Now().Format(time.RFC1123Z)

	// Build message
	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + htmlBody

	// Setup authentication
	auth := smtp.PlainAuth("", es.smtpUser, es.smtpPassword, es.smtpHost)

	// Send email
	addr := fmt.Sprintf("%s:%s", es.smtpHost, es.smtpPort)
	err := smtp.SendMail(addr, auth, es.fromEmail, []string{to}, []byte(message))
	if err != nil {
		log.Printf("Failed to send email to %s: %v", to, err)
		return err
	}

	log.Printf("Email sent successfully to %s: %s", to, subject)
	return nil
}

// SendTemplatedEmail sends an email using the base template
func (es *EmailService) SendTemplatedEmail(to, recipientName, subject, title, body, actionURL, actionText string) error {
	data := EmailData{
		RecipientName: recipientName,
		Subject:       subject,
		PreheaderText: title,
		Title:         title,
		Body:          body,
		ActionURL:     actionURL,
		ActionText:    actionText,
		FooterText:    "This is an automated message from your GRC Compliance Platform.",
		Year:          time.Now().Year(),
	}

	htmlBody, err := es.RenderEmailTemplate(data)
	if err != nil {
		return fmt.Errorf("failed to render email template: %w", err)
	}

	return es.SendEmail(to, subject, htmlBody)
}

// RenderEmailTemplate renders the base email template
func (es *EmailService) RenderEmailTemplate(data EmailData) (string, error) {
	tmpl := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Subject}}</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .email-header { background: linear-gradient(135deg, #1f4e79 0%, #2563eb 100%); padding: 40px 30px; text-align: center; }
        .email-header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; }
        .email-body { padding: 40px 30px; }
        .email-title { font-size: 20px; font-weight: 600; color: #1f2937; margin-bottom: 20px; }
        .email-text { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 20px; }
        .email-button { display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
        .email-button:hover { background-color: #1d4ed8; }
        .email-footer { padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; }
        .email-footer p { margin: 5px 0; font-size: 14px; color: #6b7280; }
        .preheader { display: none; max-height: 0; overflow: hidden; }
    </style>
</head>
<body>
    <span class="preheader">{{.PreheaderText}}</span>
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px 0;">
                <div class="email-container">
                    <div class="email-header">
                        <h1>🛡️ GRC Compliance Platform</h1>
                    </div>
                    <div class="email-body">
                        <p style="font-size: 16px; color: #4b5563; margin-bottom: 20px;">Hi {{.RecipientName}},</p>
                        <h2 class="email-title">{{.Title}}</h2>
                        <div class="email-text">{{.Body}}</div>
                        {{if .ActionURL}}
                        <center>
                            <a href="{{.ActionURL}}" class="email-button">{{.ActionText}}</a>
                        </center>
                        {{end}}
                    </div>
                    <div class="email-footer">
                        <p>{{.FooterText}}</p>
                        <p>&copy; {{.Year}} GRC Compliance Platform. All rights reserved.</p>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>`

	t, err := template.New("email").Parse(tmpl)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

// SendOverdueControlAlert sends an alert for an overdue control
func (es *EmailService) SendOverdueControlAlert(userEmail, userName, controlName, controlID string, daysOverdue int) error {
	subject := fmt.Sprintf("⚠️ Overdue Control Alert: %s", controlName)
	title := "Control Review Overdue"
	body := fmt.Sprintf(
		"Control <strong>%s</strong> is <strong>%d days overdue</strong> for review.<br><br>"+
			"Please complete the control review as soon as possible to maintain compliance.",
		controlName, daysOverdue,
	)
	actionURL := fmt.Sprintf("https://compliance.yourcompany.com/controls/%s", controlID)
	actionText := "Review Control Now"

	return es.SendTemplatedEmail(userEmail, userName, subject, title, body, actionURL, actionText)
}

// SendDueControlReminder sends a reminder for a control due soon
func (es *EmailService) SendDueControlReminder(userEmail, userName, controlName, controlID string, daysUntilDue int) error {
	subject := fmt.Sprintf("📅 Control Review Due: %s", controlName)
	title := "Control Review Reminder"
	body := fmt.Sprintf(
		"Control <strong>%s</strong> is due for review in <strong>%d days</strong>.<br><br>"+
			"Please plan to complete the review before the deadline.",
		controlName, daysUntilDue,
	)
	actionURL := fmt.Sprintf("https://compliance.yourcompany.com/controls/%s", controlID)
	actionText := "View Control"

	return es.SendTemplatedEmail(userEmail, userName, subject, title, body, actionURL, actionText)
}

// SendDailyDigest sends a daily summary email
func (es *EmailService) SendDailyDigest(userEmail, userName string, totalControls, compliantControls, overdueControls, openTickets int) error {
	subject := "📊 Daily Compliance Digest"
	title := "Your Daily Compliance Summary"
	
	complianceRate := 0
	if totalControls > 0 {
		complianceRate = (compliantControls * 100) / totalControls
	}

	body := fmt.Sprintf(
		"<strong>Controls Overview:</strong><br>"+
			"• Total Active: %d<br>"+
			"• Compliant: %d (%d%%)<br>"+
			"• Overdue: %d<br><br>"+
			"<strong>Open Tickets:</strong> %d<br><br>"+
			"Stay on top of your compliance posture with regular reviews.",
		totalControls, compliantControls, complianceRate, overdueControls, openTickets,
	)
	actionURL := "https://compliance.yourcompany.com/dashboard"
	actionText := "View Dashboard"

	return es.SendTemplatedEmail(userEmail, userName, subject, title, body, actionURL, actionText)
}

// SendWeeklyDigest sends a weekly summary email
func (es *EmailService) SendWeeklyDigest(userEmail, userName string, stats map[string]interface{}) error {
	subject := "📈 Weekly Compliance Report"
	title := "Your Weekly Compliance Summary"

	body := fmt.Sprintf(
		"<strong>This Week's Highlights:</strong><br><br>"+
			"<strong>Controls:</strong><br>"+
			"• %v total controls active<br>"+
			"• %v%% compliance rate<br>"+
			"• %v controls require attention<br><br>"+
			"<strong>Activity:</strong><br>"+
			"• %v evidence submissions<br>"+
			"• %v tickets resolved<br><br>"+
			"Great work maintaining your compliance posture!",
		stats["total_controls"],
		stats["compliance_rate"],
		stats["overdue_controls"],
		stats["evidence_submissions"],
		stats["tickets_resolved"],
	)
	actionURL := "https://compliance.yourcompany.com/reports"
	actionText := "View Full Report"

	return es.SendTemplatedEmail(userEmail, userName, subject, title, body, actionURL, actionText)
}

// SendWelcomeEmail sends a welcome email to new users
func (es *EmailService) SendWelcomeEmail(userEmail, userName string) error {
	subject := "🎉 Welcome to GRC Compliance Platform"
	title := "Welcome Aboard!"
	body := "We're excited to have you join our GRC Compliance Platform.<br><br>" +
		"Your account has been successfully created. You can now access the platform to manage controls, " +
		"track compliance, and generate reports.<br><br>" +
		"If you have any questions, please don't hesitate to reach out to your administrator."
	actionURL := "https://compliance.yourcompany.com/dashboard"
	actionText := "Get Started"

	return es.SendTemplatedEmail(userEmail, userName, subject, title, body, actionURL, actionText)
}

// SendPasswordResetEmail sends a password reset email
func (es *EmailService) SendPasswordResetEmail(userEmail, userName, resetToken string) error {
	subject := "🔐 Password Reset Request"
	title := "Reset Your Password"
	body := "We received a request to reset your password.<br><br>" +
		"Click the button below to reset your password. This link will expire in 1 hour.<br><br>" +
		"If you didn't request a password reset, please ignore this email."
	actionURL := fmt.Sprintf("https://compliance.yourcompany.com/reset-password?token=%s", resetToken)
	actionText := "Reset Password"

	return es.SendTemplatedEmail(userEmail, userName, subject, title, body, actionURL, actionText)
}

// SendReportGeneratedEmail sends a notification when a compliance report is generated
func (es *EmailService) SendReportGeneratedEmail(userEmail, userName, standardName, reportType string) error {
	subject := fmt.Sprintf("📄 Compliance Report Generated: %s", standardName)
	title := "Your Report is Ready"
	body := fmt.Sprintf(
		"Your <strong>%s</strong> compliance report for <strong>%s</strong> has been generated successfully.<br><br>"+
			"The report includes detailed control status, compliance metrics, and recommendations.",
		reportType, standardName,
	)
	actionURL := "https://compliance.yourcompany.com/compliance-reports"
	actionText := "View Reports"

	return es.SendTemplatedEmail(userEmail, userName, subject, title, body, actionURL, actionText)
}

// BatchSendEmails sends multiple emails (useful for digests)
func (es *EmailService) BatchSendEmails(emails []struct {
	To      string
	Name    string
	Subject string
	Title   string
	Body    string
}) {
	for _, email := range emails {
		go func(e struct {
			To      string
			Name    string
			Subject string
			Title   string
			Body    string
		}) {
			err := es.SendTemplatedEmail(e.To, e.Name, e.Subject, e.Title, e.Body, "", "")
			if err != nil {
				log.Printf("Failed to send batch email to %s: %v", e.To, err)
			}
		}(email)
	}
}

// IsEnabled returns whether the email service is enabled
func (es *EmailService) IsEnabled() bool {
	return es.enabled
}

// GetConfigSummary returns a summary of the email configuration (safe for logging)
func (es *EmailService) GetConfigSummary() string {
	if !es.enabled {
		return "Email service: DISABLED (SMTP not configured)"
	}
	return fmt.Sprintf("Email service: ENABLED (SMTP: %s:%s, From: %s <%s>)",
		es.smtpHost, es.smtpPort, es.fromName, es.fromEmail)
}
