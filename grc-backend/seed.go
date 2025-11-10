package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SeedControlLibrary populates the control_library table with CIS Controls IG1
func SeedControlLibrary(ctx context.Context, db *pgxpool.Pool) error {
	cisControls := []ControlLibraryItem{
		{
			ID:          "CIS-1.1",
			Standard:    "CIS v8 IG1",
			Family:      "Inventory and Control of Hardware Assets",
			Name:        "Establish and Maintain Detailed Enterprise Asset Inventory",
			Description: "Establish and maintain an accurate, detailed, and up-to-date inventory of all enterprise assets with the potential to store or process data, to include: boundary devices; internal devices; and portable and mobile devices. Ensure the inventory is maintained with automated integration, when possible.",
		},
		{
			ID:          "CIS-1.2",
			Standard:    "CIS v8 IG1",
			Family:      "Inventory and Control of Hardware Assets",
			Name:        "Address Unauthorized Assets",
			Description: "Ensure that unauthorized assets are either removed from the network, quarantined, or the inventory is updated in a timely manner.",
		},
		{
			ID:          "CIS-2.1",
			Standard:    "CIS v8 IG1",
			Family:      "Inventory and Control of Software Assets",
			Name:        "Establish and Maintain a Software Inventory",
			Description: "Establish and maintain a detailed inventory of all licensed software installed on enterprise assets. The software inventory must be automatically updated.",
		},
		{
			ID:          "CIS-3.1",
			Standard:    "CIS v8 IG1",
			Family:      "Data Protection",
			Name:        "Encrypt Sensitive Data at Rest",
			Description: "Encrypt sensitive data at rest on servers, applications, and databases containing sensitive data. Storage-layer encryption, also known as server-side encryption, meets the minimum requirement.",
		},
		{
			ID:          "CIS-4.1",
			Standard:    "CIS v8 IG1",
			Family:      "Access Control Management",
			Name:        "Establish and Maintain Access Control Policies",
			Description: "Establish and maintain access control policies, procedures, and standards for authorizing and controlling user access to information systems and data.",
		},
		{
			ID:          "CIS-5.1",
			Standard:    "CIS v8 IG1",
			Family:      "Account Management",
			Name:        "Establish and Maintain Account Management Processes",
			Description: "Establish and maintain account management processes to ensure proper lifecycle management of system and application accounts, including provisioning, use, modification, suspension, deactivation, and removal.",
		},
		{
			ID:          "CIS-6.1",
			Standard:    "CIS v8 IG1",
			Family:      "Access Control Management",
			Name:        "Use Unique Passwords",
			Description: "Use unique passwords for all user accounts and ensure that passwords are changed on a regular basis and at least once every 90 days.",
		},
		{
			ID:          "CIS-7.1",
			Standard:    "CIS v8 IG1",
			Family:      "Continuous Vulnerability Management",
			Name:        "Establish and Maintain a Vulnerability Management Process",
			Description: "Establish and maintain a documented vulnerability management process for enterprise assets. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
		},
		{
			ID:          "CIS-8.1",
			Standard:    "CIS v8 IG1",
			Family:      "Audit Log Management",
			Name:        "Establish and Maintain an Audit Log Management Process",
			Description: "Establish and maintain an audit log management process that defines the enterprise's logging requirements. At a minimum, address the collection, retention, protection, and review of audit logs for enterprise assets.",
		},
		{
			ID:          "CIS-9.1",
			Standard:    "CIS v8 IG1",
			Family:      "Email and Web Browser Protections",
			Name:        "Ensure Use of Only Fully Supported Browsers and Email Clients",
			Description: "Ensure that only fully supported browsers and email clients are allowed to execute in the enterprise, with limited exceptions for legitimate requirements.",
		},
		{
			ID:          "CIS-10.1",
			Standard:    "CIS v8 IG1",
			Family:      "Network Infrastructure Management",
			Name:        "Ensure Use of Only Fully Managed and Configured Equipment",
			Description: "Ensure that only fully managed and configured equipment can be connected to the enterprise network. This includes wireless access points, switches, routers, firewalls, and other network infrastructure equipment.",
		},
		{
			ID:          "CIS-11.1",
			Standard:    "CIS v8 IG1",
			Family:      "Network Infrastructure Management",
			Name:        "Establish and Maintain a Data Loss Prevention Program",
			Description: "Establish and maintain a data loss prevention program that includes technology, processes, and procedures to prevent the unauthorized transmission of sensitive data outside the enterprise's control.",
		},
		{
			ID:          "CIS-12.1",
			Standard:    "CIS v8 IG1",
			Family:      "Network Infrastructure Management",
			Name:        "Maintain an Inventory of Network Boundaries",
			Description: "Maintain an up-to-date inventory of all of the organization's network boundaries.",
		},
		{
			ID:          "CIS-13.1",
			Standard:    "CIS v8 IG1",
			Family:      "Network Infrastructure Management",
			Name:        "Securely Manage Enterprise Assets and Software",
			Description: "Ensure that all enterprise assets and software are exclusively procured, managed, and maintained through authorized channels.",
		},
		{
			ID:          "CIS-14.1",
			Standard:    "CIS v8 IG1",
			Family:      "Secure Configuration of Enterprise Assets and Software",
			Name:        "Establish and Maintain a Secure Configuration Process",
			Description: "Establish and maintain a secure configuration process for enterprise assets (end-user devices, including portable and mobile; network devices; non-computing/IoT devices; and servers) and software (operating systems and applications).",
		},
		{
			ID:          "CIS-15.1",
			Standard:    "CIS v8 IG1",
			Family:      "Secure Configuration of Enterprise Assets and Software",
			Name:        "Manage the Asset Inventory of Devices",
			Description: "Manage the asset inventory of devices. This inventory must include all enterprise assets, whether computing or not.",
		},
		{
			ID:          "CIS-16.1",
			Standard:    "CIS v8 IG1",
			Family:      "Maintenance, Monitoring, and Analysis of Audit Logs",
			Name:        "Activate audit logging",
			Description: "Ensure that logging is activated across enterprise assets.",
		},
		{
			ID:          "CIS-17.1",
			Standard:    "CIS v8 IG1",
			Family:      "Maintenance, Monitoring, and Analysis of Audit Logs",
			Name:        "Regularly Perform and Test Data Backups",
			Description: "Protect the confidentiality of backup information and regularly perform and test data backups.",
		},
		{
			ID:          "CIS-18.1",
			Standard:    "CIS v8 IG1",
			Family:      "Maintenance, Monitoring, and Analysis of Audit Logs",
			Name:        "Protect Audit Log Integrity",
			Description: "Protect audit log integrity by implementing and regularly testing audit log protection measures.",
		},
		{
			ID:          "CIS-19.1",
			Standard:    "CIS v8 IG1",
			Family:      "Incident Response and Management",
			Name:        "Establish and Maintain an Incident Response Process",
			Description: "Establish and maintain an incident response process that addresses the requirements in NIST SP 800-61. Review and update documentation annually, or when significant enterprise changes occur that could impact this Safeguard.",
		},
		{
			ID:          "CIS-20.1",
			Standard:    "CIS v8 IG1",
			Family:      "Penetration Testing",
			Name:        "Run Automated Vulnerability Scanning Tools",
			Description: "Run automated vulnerability scanning tools against all enterprise assets at least weekly.",
		},
	}

	// Insert controls
	for _, control := range cisControls {
		_, err := db.Exec(ctx, `
			INSERT INTO control_library (id, standard, family, name, description)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (id) DO NOTHING
		`, control.ID, control.Standard, control.Family, control.Name, control.Description)
		if err != nil {
			log.Printf("Error inserting control %s: %v", control.ID, err)
			return err
		}
	}

	// Seed test users
	err := SeedTestUsers(ctx, db)
	if err != nil {
		log.Printf("Error seeding test users: %v", err)
		return err
	}

	fmt.Printf("Seeded %d CIS controls\n", len(cisControls))
	return nil
}

// SeedTestUsers creates test users for the platform
func SeedTestUsers(ctx context.Context, db *pgxpool.Pool) error {
	testUsers := []struct {
		email    string
		name     string
		password string
		role     string
	}{
		{
			email:    "admin@company.com",
			name:     "System Administrator",
			password: "admin123", // In production, this should be hashed
			role:     "admin",
		},
		{
			email:    "user@company.com",
			name:     "Compliance User",
			password: "user123", // In production, this should be hashed
			role:     "user",
		},
		{
			email:    "john.doe@company.com",
			name:     "John Doe",
			password: "john123", // In production, this should be hashed
			role:     "user",
		},
	}

	for _, user := range testUsers {
		_, err := db.Exec(ctx, `
			INSERT INTO users (email, name, role)
			VALUES ($1, $2, $3)
			ON CONFLICT (email) DO NOTHING
		`, user.email, user.name, user.role)
		if err != nil {
			log.Printf("Error inserting user %s: %v", user.email, err)
			return err
		}
	}

	fmt.Printf("Seeded %d test users\n", len(testUsers))
	return nil
}
