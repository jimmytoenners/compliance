package main

import (
	"context"
	"fmt"
	"log"

	"github.com/robfig/cron/v3"
)

type CronService struct {
	store *Store
	cron  *cron.Cron
}

func NewCronService(store *Store) *CronService {
	return &CronService{
		store: store,
		cron:  cron.New(),
	}
}

func (cs *CronService) Start() {
	// Run every hour at minute 0
	cs.cron.AddFunc("0 * * * *", cs.checkDueControls)
	cs.cron.AddFunc("0 9 * * *", cs.sendDailySummaryNotifications) // 9 AM daily
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

func (cs *CronService) sendDailySummaryNotifications() {
	log.Println("Sending daily summary notifications...")

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

	// Get dashboard summary
	summary, err := cs.store.GetDashboardSummary(ctx)
	if err != nil {
		log.Printf("Error getting dashboard summary: %v", err)
		return
	}

	// Format summary message
	message := fmt.Sprintf(
		"Daily Summary - Controls: %d total, %d compliant, %d overdue. Tickets: %d total, %d open.",
		summary["controls"].(map[string]interface{})["total"],
		summary["controls"].(map[string]interface{})["compliant"],
		summary["controls"].(map[string]interface{})["overdue"],
		summary["tickets"].(map[string]interface{})["totalTickets"],
		summary["tickets"].(map[string]interface{})["openTickets"],
	)

	for adminRows.Next() {
		var adminID, adminName, adminEmail string

		if err := adminRows.Scan(&adminID, &adminName, &adminEmail); err != nil {
			log.Printf("Error scanning admin row: %v", err)
			continue
		}

		err = cs.store.CreateNotification(ctx, adminID, message, "/dashboard")
		if err != nil {
			log.Printf("Error creating daily summary notification for admin %s: %v", adminName, err)
		} else {
			log.Printf("Sent daily summary notification to admin %s", adminName)
		}
	}

	if err := adminRows.Err(); err != nil {
		log.Printf("Error iterating admin users: %v", err)
	}
}
