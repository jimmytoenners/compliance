package main

import (
	"context"
	"fmt"
	"log"

	"github.com/robfig/cron/v3"
)

type CronService struct {
	store *Store
	email *EmailService
	cron  *cron.Cron
}

func NewCronService(store *Store, email *EmailService) *CronService {
	return &CronService{
		store: store,
		email: email,
		cron:  cron.New(),
	}
}

func (cs *CronService) Start() {
	// Run every hour at minute 0
	cs.cron.AddFunc("0 * * * *", cs.checkDueControls)
	cs.cron.AddFunc("0 8 * * *", cs.sendDailyDigestEmails) // 8 AM daily
	cs.cron.AddFunc("0 9 * * 1", cs.sendWeeklyDigestEmails) // 9 AM every Monday
	cs.cron.Start()
	log.Println("Cron service started")
}

func (cs *CronService) Stop() {
	ctx := cs.cron.Stop()
	<-ctx.Done()
	log.Println("Cron service stopped")
}

func (cs *CronService) checkDueControls() {
	log.Println("Checking for due controls...")

	ctx := context.Background()

	// Get controls that are due today or overdue
	rows, err := cs.store.db.Query(ctx, `
		SELECT ac.id, ac.control_library_id, ac.owner_id, u.name, u.email
		FROM activated_controls ac
		LEFT JOIN users u ON ac.owner_id = u.id
		WHERE ac.status = 'active'
		AND ac.next_review_due_date <= CURRENT_DATE
		AND ac.owner_id IS NOT NULL
	`)
	if err != nil {
		log.Printf("Error querying due controls: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var controlID, controlLibraryID, ownerID string
		var ownerName, ownerEmail *string

		if err := rows.Scan(&controlID, &controlLibraryID, &ownerID, &ownerName, &ownerEmail); err != nil {
			log.Printf("Error scanning due control row: %v", err)
			continue
		}

		// Create notification for the control owner
		message := fmt.Sprintf("Control %s is due for review", controlLibraryID)
		linkURL := fmt.Sprintf("/controls/activated/%s", controlID)

		err = cs.store.CreateNotification(ctx, ownerID, message, linkURL)
		if err != nil {
			log.Printf("Error creating due control notification: %v", err)
		} else {
			log.Printf("Created due control notification for control %s", controlLibraryID)
		}

		// Send email notification if email is enabled and user has email
		if cs.email.IsEnabled() && ownerEmail != nil && *ownerEmail != "" {
			name := "User"
			if ownerName != nil {
				name = *ownerName
			}
			err = cs.email.SendDueControlReminder(*ownerEmail, name, controlLibraryID, controlID, 0)
			if err != nil {
				log.Printf("Error sending due control email to %s: %v", *ownerEmail, err)
			}
		}
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating due controls: %v", err)
	}
}

func (cs *CronService) checkOverdueControls() {
	log.Println("Checking for overdue controls...")

	ctx := context.Background()

	// Get controls that are overdue (more than 7 days past due)
	rows, err := cs.store.db.Query(ctx, `
		SELECT ac.id, ac.control_library_id, ac.owner_id, u.name, u.email
		FROM activated_controls ac
		LEFT JOIN users u ON ac.owner_id = u.id
		WHERE ac.status = 'active'
		AND ac.next_review_due_date < CURRENT_DATE - INTERVAL '7 days'
		AND ac.owner_id IS NOT NULL
	`)
	if err != nil {
		log.Printf("Error querying overdue controls: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var controlID, controlLibraryID, ownerID string
		var ownerName, ownerEmail *string

		if err := rows.Scan(&controlID, &controlLibraryID, &ownerID, &ownerName, &ownerEmail); err != nil {
			log.Printf("Error scanning overdue control row: %v", err)
			continue
		}

		// Create urgent notification for overdue controls
		message := fmt.Sprintf("URGENT: Control %s is overdue for review", controlLibraryID)
		linkURL := fmt.Sprintf("/controls/activated/%s", controlID)

		err = cs.store.CreateNotification(ctx, ownerID, message, linkURL)
		if err != nil {
			log.Printf("Error creating overdue control notification: %v", err)
		} else {
			log.Printf("Created overdue control notification for control %s", controlLibraryID)
		}
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating overdue controls: %v", err)
	}
}

func (cs *CronService) sendDailyDigestEmails() {
	log.Println("Sending daily digest emails...")

	ctx := context.Background()

	// Get all admin users
	adminRows, err := cs.store.db.Query(ctx, `
		SELECT id, name, email
		FROM users
		WHERE role = 'admin'
	`)
	if err != nil {
		log.Printf("Error querying admin users: %v", err)
		return
	}
	defer adminRows.Close()

	// Get control counts
	var totalControls, compliantControls, overdueControls int
	err = cs.store.db.QueryRow(ctx, `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'compliant') as compliant,
			COUNT(*) FILTER (WHERE next_review_due_date < CURRENT_DATE) as overdue
		FROM activated_controls
	`).Scan(&totalControls, &compliantControls, &overdueControls)
	if err != nil {
		log.Printf("Error getting control counts: %v", err)
		return
	}

	// Get open ticket count
	var openTickets int
	err = cs.store.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM tickets
		WHERE status IN ('new', 'in_progress')
	`).Scan(&openTickets)
	if err != nil {
		log.Printf("Error getting open ticket count: %v", err)
		return
	}

	for adminRows.Next() {
		var adminID, adminName, adminEmail string

		if err := adminRows.Scan(&adminID, &adminName, &adminEmail); err != nil {
			log.Printf("Error scanning admin row: %v", err)
			continue
		}

		// Send email if email service is enabled
		if cs.email.IsEnabled() && adminEmail != "" {
			err = cs.email.SendDailyDigest(adminEmail, adminName, totalControls, compliantControls, overdueControls, openTickets)
			if err != nil {
				log.Printf("Error sending daily digest email to %s: %v", adminEmail, err)
			} else {
				log.Printf("Sent daily digest email to %s", adminEmail)
			}
		}
	}

	if err := adminRows.Err(); err != nil {
		log.Printf("Error iterating admin users: %v", err)
	}
}

func (cs *CronService) sendWeeklyDigestEmails() {
	log.Println("Sending weekly digest emails...")

	ctx := context.Background()

	// Get all admin users
	adminRows, err := cs.store.db.Query(ctx, `
		SELECT id, name, email
		FROM users
		WHERE role = 'admin'
	`)
	if err != nil {
		log.Printf("Error querying admin users: %v", err)
		return
	}
	defer adminRows.Close()

	// Get weekly stats
	var totalControls, compliantControls, overdueControls int
	err = cs.store.db.QueryRow(ctx, `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'compliant') as compliant,
			COUNT(*) FILTER (WHERE next_review_due_date < CURRENT_DATE) as overdue
		FROM activated_controls
	`).Scan(&totalControls, &compliantControls, &overdueControls)
	if err != nil {
		log.Printf("Error getting control counts: %v", err)
		return
	}

	// Get evidence submissions in the last 7 days
	var evidenceSubmissions int
	err = cs.store.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM control_evidence_log
		WHERE performed_at >= NOW() - INTERVAL '7 days'
	`).Scan(&evidenceSubmissions)
	if err != nil {
		log.Printf("Error getting evidence count: %v", err)
		return
	}

	// Get tickets resolved in the last 7 days
	var ticketsResolved int
	err = cs.store.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM tickets
		WHERE status IN ('resolved', 'closed')
		AND resolved_at >= NOW() - INTERVAL '7 days'
	`).Scan(&ticketsResolved)
	if err != nil {
		log.Printf("Error getting resolved tickets count: %v", err)
		return
	}

	// Calculate compliance rate
	complianceRate := 0
	if totalControls > 0 {
		complianceRate = (compliantControls * 100) / totalControls
	}

	stats := map[string]interface{}{
		"total_controls":        totalControls,
		"compliance_rate":       complianceRate,
		"overdue_controls":      overdueControls,
		"evidence_submissions":  evidenceSubmissions,
		"tickets_resolved":      ticketsResolved,
	}

	for adminRows.Next() {
		var adminID, adminName, adminEmail string

		if err := adminRows.Scan(&adminID, &adminName, &adminEmail); err != nil {
			log.Printf("Error scanning admin row: %v", err)
			continue
		}

		// Send email if email service is enabled
		if cs.email.IsEnabled() && adminEmail != "" {
			err = cs.email.SendWeeklyDigest(adminEmail, adminName, stats)
			if err != nil {
				log.Printf("Error sending weekly digest email to %s: %v", adminEmail, err)
			} else {
				log.Printf("Sent weekly digest email to %s", adminEmail)
			}
		}
	}

	if err := adminRows.Err(); err != nil {
		log.Printf("Error iterating admin users: %v", err)
	}
}
