package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SeedControlLibrary populates the control_library table with CIS, ISO27001, and NIS-2 controls
func SeedControlLibrary(ctx context.Context, db *pgxpool.Pool) error {
	var allControls []ControlLibraryItem

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

	iso27001Controls := []ControlLibraryItem{
		{
			ID:          "ISO27001-A.5.1",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Organizational Controls",
			Name:        "Policies for information security",
			Description: "Information security policy and topic-specific policies shall be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties, and reviewed at planned intervals and if significant changes occur.",
		},
		{
			ID:          "ISO27001-A.5.2",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Organizational Controls",
			Name:        "Information security roles and responsibilities",
			Description: "Information security roles and responsibilities shall be defined and allocated according to the organization needs.",
		},
		{
			ID:          "ISO27001-A.5.3",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Organizational Controls",
			Name:        "Segregation of duties",
			Description: "Conflicting duties and conflicting areas of responsibility shall be segregated.",
		},
		{
			ID:          "ISO27001-A.5.7",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Organizational Controls",
			Name:        "Threat intelligence",
			Description: "Information relating to information security threats shall be collected and analyzed to produce threat intelligence.",
		},
		{
			ID:          "ISO27001-A.5.10",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Organizational Controls",
			Name:        "Acceptable use of information and other associated assets",
			Description: "Rules for the acceptable use and procedures for handling information and other associated assets shall be identified, documented and implemented.",
		},
		{
			ID:          "ISO27001-A.5.15",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Organizational Controls",
			Name:        "Access control",
			Description: "Rules to control physical and logical access to information and other associated assets shall be established and implemented based on business and information security requirements.",
		},
		{
			ID:          "ISO27001-A.5.16",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Organizational Controls",
			Name:        "Identity management",
			Description: "The full life cycle of identities shall be managed.",
		},
		{
			ID:          "ISO27001-A.5.17",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Organizational Controls",
			Name:        "Authentication information",
			Description: "Allocation and management of authentication information shall be controlled by a management process, including advising personnel on appropriate handling of authentication information.",
		},
		{
			ID:          "ISO27001-A.5.23",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Organizational Controls",
			Name:        "Information security for use of cloud services",
			Description: "Processes for acquisition, use, management and exit from cloud services shall be established in accordance with the organization's information security requirements.",
		},
		{
			ID:          "ISO27001-A.5.30",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Organizational Controls",
			Name:        "ICT readiness for business continuity",
			Description: "ICT readiness shall be planned, implemented, maintained and tested based on business continuity objectives and ICT continuity requirements.",
		},
		{
			ID:          "ISO27001-A.8.1",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "User endpoint devices",
			Description: "Information stored on, processed by or accessible via user endpoint devices shall be protected.",
		},
		{
			ID:          "ISO27001-A.8.2",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Privileged access rights",
			Description: "The allocation and use of privileged access rights shall be restricted and managed.",
		},
		{
			ID:          "ISO27001-A.8.3",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Information access restriction",
			Description: "Access to information and other associated assets shall be restricted in accordance with the established topic-specific policy on access control.",
		},
		{
			ID:          "ISO27001-A.8.4",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Access to source code",
			Description: "Read and write access to source code, development tools and software libraries shall be appropriately managed.",
		},
		{
			ID:          "ISO27001-A.8.5",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Secure authentication",
			Description: "Secure authentication technologies and procedures shall be implemented based on information access restrictions and the topic-specific policy on access control.",
		},
		{
			ID:          "ISO27001-A.8.9",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Configuration management",
			Description: "Configurations, including security configurations, of hardware, software, services and networks shall be established, documented, implemented, monitored and reviewed.",
		},
		{
			ID:          "ISO27001-A.8.10",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Information deletion",
			Description: "Information stored in information systems, devices or in any other storage media shall be deleted when no longer required.",
		},
		{
			ID:          "ISO27001-A.8.11",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Data masking",
			Description: "Data masking shall be used in accordance with the organization's topic-specific policy on access control and other related topic-specific policies, and business requirements, taking applicable legislation into consideration.",
		},
		{
			ID:          "ISO27001-A.8.12",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Data leakage prevention",
			Description: "Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information.",
		},
		{
			ID:          "ISO27001-A.8.16",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Monitoring activities",
			Description: "Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents.",
		},
		{
			ID:          "ISO27001-A.8.23",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Web filtering",
			Description: "Access to external websites shall be managed to reduce exposure to malicious content.",
		},
		{
			ID:          "ISO27001-A.8.24",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Use of cryptography",
			Description: "Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented.",
		},
		{
			ID:          "ISO27001-A.8.28",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Secure coding",
			Description: "Secure coding principles shall be applied to software development.",
		},
		{
			ID:          "ISO27001-A.8.31",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Separation of development, test and production environments",
			Description: "Development, testing and production environments shall be separated and secured.",
		},
		{
			ID:          "ISO27001-A.8.34",
			Standard:    "ISO/IEC 27001:2022",
			Family:      "Technological Controls",
			Name:        "Protection of information systems during audit testing",
			Description: "Tests and other assurance activities involving assessment of operational systems shall be planned and agreed between the tester and appropriate management.",
		},
	}

	nis2Controls := []ControlLibraryItem{
		{
			ID:          "NIS2-Art6.1",
			Standard:    "NIS-2 Directive",
			Family:      "Cybersecurity Risk Management",
			Name:        "Risk analysis and information system security policies",
			Description: "Essential and important entities shall take appropriate and proportionate technical, operational and organisational measures to manage the risks posed to the security of network and information systems. Measures shall include policies on risk analysis and information system security.",
		},
		{
			ID:          "NIS2-Art6.2",
			Standard:    "NIS-2 Directive",
			Family:      "Cybersecurity Risk Management",
			Name:        "Incident handling",
			Description: "Essential and important entities shall have policies and procedures in place to handle incidents, including detection, analysis, containment, recovery and lessons learned.",
		},
		{
			ID:          "NIS2-Art6.3",
			Standard:    "NIS-2 Directive",
			Family:      "Cybersecurity Risk Management",
			Name:        "Business continuity and crisis management",
			Description: "Essential and important entities shall implement business continuity policies, such as backup management and disaster recovery, and crisis management.",
		},
		{
			ID:          "NIS2-Art6.4",
			Standard:    "NIS-2 Directive",
			Family:      "Cybersecurity Risk Management",
			Name:        "Supply chain security",
			Description: "Essential and important entities shall implement policies and procedures to address the security of supply chains, including security-related aspects concerning the relationships between each entity and its direct suppliers or service providers.",
		},
		{
			ID:          "NIS2-Art6.5",
			Standard:    "NIS-2 Directive",
			Family:      "Cybersecurity Risk Management",
			Name:        "Security in network and information systems acquisition, development and maintenance",
			Description: "Essential and important entities shall implement policies and procedures to assess the effectiveness of cybersecurity risk-management measures, including during the acquisition, development and maintenance of network and information systems.",
		},
		{
			ID:          "NIS2-Art6.6",
			Standard:    "NIS-2 Directive",
			Family:      "Cybersecurity Risk Management",
			Name:        "Policies and procedures for the use of cryptography and encryption",
			Description: "Essential and important entities shall implement policies and procedures for the use of cryptography and, where appropriate, encryption.",
		},
		{
			ID:          "NIS2-Art6.7",
			Standard:    "NIS-2 Directive",
			Family:      "Cybersecurity Risk Management",
			Name:        "Human resources security, access control policies and asset management",
			Description: "Essential and important entities shall implement human resources security policies, access control policies and asset management.",
		},
		{
			ID:          "NIS2-Art6.8",
			Standard:    "NIS-2 Directive",
			Family:      "Cybersecurity Risk Management",
			Name:        "Multi-factor authentication and secured voice, video and text communications",
			Description: "Essential and important entities shall implement the use of multi-factor authentication or continuous authentication solutions, secured voice, video and text communications and secured emergency communication systems within the entity, where appropriate.",
		},
		{
			ID:          "NIS2-Art21.1",
			Standard:    "NIS-2 Directive",
			Family:      "Reporting Obligations",
			Name:        "Early warning notification (24 hours)",
			Description: "Essential and important entities shall notify the CSIRT or the competent authority without undue delay and in any event within 24 hours of becoming aware of a significant incident.",
		},
		{
			ID:          "NIS2-Art21.2",
			Standard:    "NIS-2 Directive",
			Family:      "Reporting Obligations",
			Name:        "Incident notification (72 hours)",
			Description: "Essential and important entities shall submit an incident notification without undue delay and in any event within 72 hours of becoming aware of the significant incident.",
		},
		{
			ID:          "NIS2-Art21.3",
			Standard:    "NIS-2 Directive",
			Family:      "Reporting Obligations",
			Name:        "Final report (1 month)",
			Description: "Essential and important entities shall submit a final report not later than one month after the incident notification, including detailed description of the incident, its severity and impact, type of threat, and applied countermeasures.",
		},
		{
			ID:          "NIS2-Art21.4",
			Standard:    "NIS-2 Directive",
			Family:      "Reporting Obligations",
			Name:        "Significant cyber threat reporting",
			Description: "Essential and important entities may submit reports on significant cyber threats that could potentially result in a significant incident.",
		},
		{
			ID:          "NIS2-Art20.1",
			Standard:    "NIS-2 Directive",
			Family:      "Management Responsibility",
			Name:        "Management body approval and oversight",
			Description: "The management body of the essential and important entity shall approve the cybersecurity risk-management measures taken by the entity, oversee their implementation, and can be held liable for infringements.",
		},
		{
			ID:          "NIS2-Art20.2",
			Standard:    "NIS-2 Directive",
			Family:      "Management Responsibility",
			Name:        "Training obligations for management",
			Description: "The management body shall follow specific training and members shall acquire appropriate knowledge and skills to understand and assess cybersecurity risks and management practices.",
		},
		{
			ID:          "NIS2-Art23.1",
			Standard:    "NIS-2 Directive",
			Family:      "Voluntary Information Sharing",
			Name:        "Voluntary sharing of cyber threat information",
			Description: "Entities may exchange relevant information among themselves, with competent authorities, and with relevant EU institutions on specific cyber threats, vulnerabilities, and incidents.",
		},
	}

	// Combine all controls
	allControls = append(allControls, cisControls...)
	allControls = append(allControls, iso27001Controls...)
	allControls = append(allControls, nis2Controls...)

	// Insert controls
	for _, control := range allControls {
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

	fmt.Printf("Successfully seeded %d controls (%d CIS, %d ISO27001, %d NIS-2)\n", 
		len(allControls), len(cisControls), len(iso27001Controls), len(nis2Controls))
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

// SeedControlTemplates loads control templates from JSON and populates database
func SeedControlTemplates(ctx context.Context, db *pgxpool.Pool) error {
	// Read control-templates.json
	file, err := os.ReadFile("../control-templates.json")
	if err != nil {
		log.Printf("Warning: Could not read control-templates.json: %v", err)
		return err
	}

	var data struct {
		Templates []struct {
			ID             string `json:"id"`
			Name           string `json:"name"`
			Description    string `json:"description"`
			MaturityLevel  string `json:"maturity_level"`
			RecommendedFor string `json:"recommended_for"`
			EstimatedTime  string `json:"estimated_time"`
			Controls       []struct {
				ControlID string `json:"control_id"`
				Priority  string `json:"priority"`
				Rationale string `json:"rationale"`
			} `json:"controls"`
		} `json:"templates"`
	}

	if err := json.Unmarshal(file, &data); err != nil {
		log.Printf("Error parsing control-templates.json: %v", err)
		return err
	}

	// Insert templates and template_controls
	for _, template := range data.Templates {
		// Insert into control_templates
		_, err := db.Exec(ctx, `
			INSERT INTO control_templates (id, name, description, maturity_level, recommended_for, estimated_time)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				description = EXCLUDED.description,
				maturity_level = EXCLUDED.maturity_level,
				recommended_for = EXCLUDED.recommended_for,
				estimated_time = EXCLUDED.estimated_time,
				updated_at = NOW()
		`, template.ID, template.Name, template.Description, template.MaturityLevel,
			template.RecommendedFor, template.EstimatedTime)
		if err != nil {
			log.Printf("Failed to insert template %s: %v", template.ID, err)
			continue
		}

		// Delete existing template controls to handle removals
		_, err = db.Exec(ctx, `DELETE FROM template_controls WHERE template_id = $1`, template.ID)
		if err != nil {
			log.Printf("Failed to delete old template controls for %s: %v", template.ID, err)
		}

		// Insert template controls
		for _, control := range template.Controls {
			_, err := db.Exec(ctx, `
				INSERT INTO template_controls (template_id, control_library_id, priority, rationale)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (template_id, control_library_id) DO UPDATE SET
					priority = EXCLUDED.priority,
					rationale = EXCLUDED.rationale
			`, template.ID, control.ControlID, control.Priority, control.Rationale)
			if err != nil {
				log.Printf("Failed to insert control %s for template %s: %v",
					control.ControlID, template.ID, err)
			}
		}
	}

	fmt.Printf("Successfully seeded %d control templates\n", len(data.Templates))
	return nil
}
