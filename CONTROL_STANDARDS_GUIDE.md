# Control Standards Library Guide

## Overview

The GRC platform now includes **61 compliance controls** across 3 major frameworks:

- **CIS v8 IG1**: 21 controls
- **ISO/IEC 27001:2022**: 25 controls  
- **NIS-2 Directive**: 15 controls

These controls are automatically seeded into the `control_library` table when the backend starts.

## Accessing Controls

### Via API

All controls are accessible through the Control Library API endpoint (requires authentication):

```bash
GET /api/v1/controls/library
```

Example with authentication:
```bash
# First, login to get a JWT token
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}' \
  | jq -r '.token')

# Then fetch all controls
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/controls/library
```

### Via Database

Direct database query:
```bash
psql postgres://grc_user:grc_password@localhost:5444/grc_db \
  -c "SELECT standard, COUNT(*) FROM control_library GROUP BY standard ORDER BY standard;"
```

Expected output:
```
      standard      | count 
--------------------+-------
 CIS v8 IG1         |    21
 ISO/IEC 27001:2022 |    25
 NIS-2 Directive    |    15
```

## Control Structure

Each control has the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | Unique control identifier (e.g., "CIS-1.1", "ISO27001-A.5.1", "NIS2-Art6.1") |
| `standard` | TEXT | Framework name (e.g., "CIS v8 IG1", "ISO/IEC 27001:2022", "NIS-2 Directive") |
| `family` | TEXT | Control category/domain |
| `name` | TEXT | Short control name |
| `description` | TEXT | Full control requirement description |

## Control Frameworks

### 1. CIS v8 IG1 (21 controls)

**Implementation Group 1** - Essential cybersecurity controls for all organizations.

**Families:**
- Inventory and Control of Hardware Assets (CIS-1.x)
- Inventory and Control of Software Assets (CIS-2.x)
- Data Protection (CIS-3.x)
- Access Control Management (CIS-4.x, CIS-6.x)
- Account Management (CIS-5.x)
- Continuous Vulnerability Management (CIS-7.x)
- Audit Log Management (CIS-8.x)
- Email and Web Browser Protections (CIS-9.x)
- Network Infrastructure Management (CIS-10.x - CIS-13.x)
- Secure Configuration (CIS-14.x, CIS-15.x)
- Maintenance, Monitoring, and Analysis of Audit Logs (CIS-16.x - CIS-18.x)
- Incident Response and Management (CIS-19.x)
- Penetration Testing (CIS-20.x)

**Example Controls:**
- `CIS-1.1`: Establish and Maintain Detailed Enterprise Asset Inventory
- `CIS-3.1`: Encrypt Sensitive Data at Rest
- `CIS-7.1`: Establish and Maintain a Vulnerability Management Process

### 2. ISO/IEC 27001:2022 (25 controls)

**The 2022 revision** of the international information security standard.

**Control Categories:**

#### Organizational Controls (10 controls)
- `ISO27001-A.5.1`: Policies for information security
- `ISO27001-A.5.2`: Information security roles and responsibilities
- `ISO27001-A.5.3`: Segregation of duties
- `ISO27001-A.5.7`: Threat intelligence
- `ISO27001-A.5.10`: Acceptable use of information and other associated assets
- `ISO27001-A.5.15`: Access control
- `ISO27001-A.5.16`: Identity management
- `ISO27001-A.5.17`: Authentication information
- `ISO27001-A.5.23`: Information security for use of cloud services
- `ISO27001-A.5.30`: ICT readiness for business continuity

#### Technological Controls (15 controls)
- `ISO27001-A.8.1`: User endpoint devices
- `ISO27001-A.8.2`: Privileged access rights
- `ISO27001-A.8.3`: Information access restriction
- `ISO27001-A.8.4`: Access to source code
- `ISO27001-A.8.5`: Secure authentication
- `ISO27001-A.8.9`: Configuration management
- `ISO27001-A.8.10`: Information deletion
- `ISO27001-A.8.11`: Data masking
- `ISO27001-A.8.12`: Data leakage prevention
- `ISO27001-A.8.16`: Monitoring activities
- `ISO27001-A.8.23`: Web filtering
- `ISO27001-A.8.24`: Use of cryptography
- `ISO27001-A.8.28`: Secure coding
- `ISO27001-A.8.31`: Separation of development, test and production environments
- `ISO27001-A.8.34`: Protection of information systems during audit testing

**Note:** ISO 27001:2022 Annex A contains 93 total controls. The 25 most critical controls have been implemented.

### 3. NIS-2 Directive (15 controls)

**EU Directive 2022/2555** - Network and Information Security requirements for essential and important entities.

**Control Categories:**

#### Cybersecurity Risk Management (8 controls)
- `NIS2-Art6.1`: Risk analysis and information system security policies
- `NIS2-Art6.2`: Incident handling
- `NIS2-Art6.3`: Business continuity and crisis management
- `NIS2-Art6.4`: Supply chain security
- `NIS2-Art6.5`: Security in network and information systems acquisition, development and maintenance
- `NIS2-Art6.6`: Policies and procedures for the use of cryptography and encryption
- `NIS2-Art6.7`: Human resources security, access control policies and asset management
- `NIS2-Art6.8`: Multi-factor authentication and secured voice, video and text communications

#### Reporting Obligations (4 controls)
- `NIS2-Art21.1`: Early warning notification (24 hours)
- `NIS2-Art21.2`: Incident notification (72 hours)
- `NIS2-Art21.3`: Final report (1 month)
- `NIS2-Art21.4`: Significant cyber threat reporting

#### Management Responsibility (2 controls)
- `NIS2-Art20.1`: Management body approval and oversight
- `NIS2-Art20.2`: Training obligations for management

#### Voluntary Information Sharing (1 control)
- `NIS2-Art23.1`: Voluntary sharing of cyber threat information

**Key NIS-2 Requirements:**
- Essential and important entities must implement cybersecurity measures
- Management body is liable for cybersecurity compliance
- Mandatory incident reporting with strict timelines (24h, 72h, 1 month)
- Supply chain security is explicitly required

## Activating Controls

To implement a control in your organization:

1. **Browse Control Library** - Navigate to `/controls` in the platform
2. **Select Framework** - Filter by CIS, ISO27001, or NIS-2
3. **Activate Control** - Click "Activate" on a control
4. **Set Parameters**:
   - Assign an owner (user responsible)
   - Set review frequency (e.g., quarterly, annually)
   - Set next review due date
   - Link to relevant assets, documents, and risks

5. **Submit Evidence** - Upload evidence of implementation
6. **Track Compliance** - Monitor control status on the dashboard

## Control Mappings

Controls can be linked to:

- **Assets** - Which systems/applications implement this control?
- **Documents** - Which policies/procedures support this control?
- **Risks** - Which risks does this control mitigate?
- **Vendors** - Which vendors need to demonstrate this control?

## Extending the Library

To add more controls, edit `grc-backend/seed.go`:

1. Add controls to the appropriate array (`cisControls`, `iso27001Controls`, `nis2Controls`)
2. Follow the existing structure:
   ```go
   {
       ID:          "FRAMEWORK-ID",
       Standard:    "Framework Name",
       Family:      "Control Category",
       Name:        "Short Name",
       Description: "Full requirement description",
   }
   ```
3. Rebuild the backend: `go build`
4. Restart - controls are automatically seeded on startup
5. Use `ON CONFLICT DO NOTHING` - duplicate IDs are safely ignored

## Future Enhancements

Potential additions:
- **CIS v8 IG2 & IG3** - Additional controls for medium and large organizations
- **ISO 27001 Full Annex A** - Remaining 68 controls
- **NIST CSF 2.0** - National Institute of Standards and Technology Cybersecurity Framework
- **GDPR Articles** - Map specific GDPR requirements to controls
- **SOC 2 Trust Service Criteria** - For SaaS companies
- **PCI DSS 4.0** - Payment card industry requirements
- **HIPAA** - Healthcare data protection controls

## Support

For questions or issues:
- Check MASTER_PROGRESS.md for implementation details
- Review database schema in `grc-backend/schema.sql`
- Examine seed.go for control definitions
- API documentation in README.md
