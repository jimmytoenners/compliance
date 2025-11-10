# GRC Platform Configuration Guide

## Overview

This guide covers the configuration and setup of the GRC Platform after installation. It includes initial setup, user management, integrations, and maintenance configurations.

## Initial Setup

### First Admin User Setup

After installation, access the platform at your configured URL and log in with the default credentials:

- **Email**: `admin@company.com`
- **Password**: `admin123`

⚠️ **Important**: Change these credentials immediately after first login!

#### Creating Additional Admin Users

1. Log in as the default admin
2. Navigate to **Settings** → **User Management**
3. Click **Create User**
4. Fill in the details:
   - **Email**: New admin's email
   - **Name**: Full name
   - **Role**: Select "Admin"
   - **Password**: Set a secure temporary password
5. The new admin will receive an email with login instructions

### Password Policy Configuration

Configure password requirements in the admin settings:

1. Go to **Settings** → **Security**
2. Set minimum password length (recommended: 12 characters)
3. Enable complexity requirements:
   - Uppercase letters
   - Lowercase letters
   - Numbers
   - Special characters
4. Set password expiration (recommended: 90 days)

## System Configuration

### Database Configuration

The database connection is configured via environment variables. For production:

```bash
# In your .env file
DATABASE_URL=postgres://grc_user:SECURE_PASSWORD@db:5432/grc_db?sslmode=require
```

#### Database Maintenance

Set up automated maintenance tasks:

```sql
-- Vacuum and analyze tables weekly
VACUUM ANALYZE;

-- Reindex tables monthly
REINDEX DATABASE grc_db;

-- Monitor table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Email Configuration

Configure SMTP settings for notifications:

1. Go to **Settings** → **Email Configuration**
2. Enter your SMTP server details:
   - **Host**: `smtp.yourcompany.com`
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Username**: `grc@yourcompany.com`
   - **Password**: Your SMTP password or app password
3. Test the configuration by sending a test email

#### Email Templates

Customize email templates for different notifications:

- **Control Due Notifications**: Alert users when controls are approaching due dates
- **Ticket Updates**: Notify users of ticket status changes
- **Password Reset**: Secure password reset emails
- **Welcome Emails**: New user onboarding

### API Key Management

#### External Portal API Key

The external portal uses API key authentication:

1. Go to **Settings** → **API Keys**
2. Generate a new API key for the portal
3. Update your `.env` file:
   ```bash
   EXTERNAL_API_KEY=your-generated-api-key
   ```
4. Restart the services

#### Third-Party Integrations

Configure API keys for external integrations:

- **SIEM Systems**: For security event correlation
- **Asset Management**: Automatic asset discovery
- **Identity Providers**: SSO integration (SAML/OAuth)

## GRC Module Configuration

### Control Library Setup

#### Loading Control Frameworks

1. Go to **Controls** → **Library Management**
2. Upload control frameworks:
   - **CIS Controls**: Security best practices
   - **NIST SP 800-53**: Federal security controls
   - **ISO 27001**: Information security management
   - **SOC 2**: Trust services criteria

#### Custom Controls

Create organization-specific controls:

1. Navigate to **Controls** → **Create Control**
2. Define:
   - **Control ID**: Unique identifier
   - **Name**: Descriptive name
   - **Description**: Detailed requirements
   - **Framework**: Custom or existing framework
   - **Review Frequency**: Monthly, quarterly, annually

### Control Activation

#### Bulk Activation

For efficient setup:

1. Go to **Controls** → **Bulk Actions**
2. Select multiple controls
3. Set common parameters:
   - **Owner**: Assign to user or team
   - **Review Interval**: Frequency of reviews
   - **Due Date**: Initial due date

#### Automated Activation

Set up rules for automatic control activation based on:
- Asset type
- Business unit
- Regulatory requirements
- Risk level

## ITSM Module Configuration

### Ticket Categories

Configure ticket categories for better organization:

1. Go to **Settings** → **Ticket Configuration**
2. Create categories:
   - **Security Incident**
   - **Access Request**
   - **Compliance Issue**
   - **System Change**
   - **General Inquiry**

### SLA Configuration

Set up Service Level Agreements:

1. Navigate to **Settings** → **SLA Management**
2. Define SLAs by priority:
   - **Critical**: 1 hour response, 4 hours resolution
   - **High**: 4 hours response, 24 hours resolution
   - **Medium**: 8 hours response, 72 hours resolution
   - **Low**: 24 hours response, 1 week resolution

### Workflow Configuration

Customize ticket workflows:

1. Go to **Settings** → **Workflows**
2. Configure states and transitions:
   - **New** → **Assigned** → **In Progress** → **Resolved** → **Closed**
   - **Reopened** → **Assigned**
   - **Escalated** → **Management Review**

## Asset Management Configuration

### Asset Types

Define asset categories:

1. Go to **Assets** → **Configuration**
2. Create asset types:
   - **Servers**: Physical and virtual
   - **Databases**: SQL, NoSQL, data warehouses
   - **Applications**: Web apps, mobile apps, APIs
   - **Network Devices**: Firewalls, switches, routers
   - **Cloud Resources**: VMs, storage, services

### Asset Discovery

Set up automated asset discovery:

1. Navigate to **Assets** → **Discovery**
2. Configure discovery methods:
   - **Network scanning**
   - **Cloud API integration**
   - **Agent-based discovery**
   - **Manual registration**

### Asset Classification

Configure risk-based classification:

- **Critical**: High business impact
- **Important**: Medium business impact
- **Standard**: Low business impact

## Document Management Configuration

### Document Types

Configure document categories:

1. Go to **Documents** → **Configuration**
2. Define document types:
   - **Policies**: Security policies, procedures
   - **Standards**: Technical standards, guidelines
   - **Evidence**: Compliance evidence, audit reports
   - **Training Materials**: User guides, training docs

### Version Control

Set up document versioning:

1. Navigate to **Documents** → **Version Settings**
2. Configure:
   - **Auto-versioning**: Automatic version increments
   - **Approval workflow**: Required approvals for new versions
   - **Retention policy**: How long to keep old versions

### Access Control

Configure document permissions:

- **Public**: Available to all users
- **Internal**: Internal staff only
- **Restricted**: Specific roles or individuals
- **Confidential**: Management and auditors only

## Notification Configuration

### Notification Types

Configure different notification types:

1. Go to **Settings** → **Notifications**
2. Set up notifications for:
   - **Control due dates**: Reminders before deadlines
   - **Ticket assignments**: New ticket notifications
   - **System alerts**: Platform health issues
   - **Audit events**: Security-relevant activities

### Notification Channels

Configure delivery methods:

- **Email**: Primary notification method
- **In-app**: Platform notifications
- **SMS**: Critical alerts (premium feature)
- **Slack/Teams**: Team collaboration integration

### Notification Rules

Set up intelligent notification rules:

```yaml
# Example notification rule
control_due_soon:
  trigger: control.due_date < 7.days.from_now
  recipients: control.owner, control.reviewer
  channels: [email, in_app]
  priority: medium

ticket_escalated:
  trigger: ticket.priority == 'critical' && ticket.status == 'open' > 24.hours
  recipients: management_team
  channels: [email, sms]
  priority: high
```

## Audit Configuration

### Audit Settings

Configure audit logging:

1. Go to **Settings** → **Audit Configuration**
2. Set audit levels:
   - **Read operations**: Log all data access
   - **Write operations**: Log all data modifications
   - **Authentication events**: Login/logout activities
   - **Administrative actions**: Configuration changes

### Audit Retention

Configure log retention policies:

- **Operational logs**: 90 days
- **Security logs**: 1 year
- **Audit logs**: 7 years (compliance requirement)

### Audit Reports

Set up automated audit reports:

1. Navigate to **Audit** → **Reports**
2. Schedule reports:
   - **Daily activity summary**
   - **Weekly compliance status**
   - **Monthly audit trail review**
   - **Quarterly executive summary**

## Backup Configuration

### Automated Backups

Configure backup schedules:

1. Go to **Settings** → **Backup Configuration**
2. Set backup frequency:
   - **Database**: Daily full backup
   - **Configuration**: Daily configuration backup
   - **Logs**: Weekly log archival

### Backup Storage

Configure backup destinations:

- **Local storage**: On-premise NAS/SAN
- **Cloud storage**: AWS S3, Azure Blob, Google Cloud
- **Encrypted**: Ensure backups are encrypted at rest

### Backup Testing

Regular backup integrity testing:

```bash
# Test database backup restoration
pg_restore -d test_db /path/to/backup.sql

# Verify backup contents
pg_dump -s test_db | head -20
```

## Security Configuration

### Access Control

Configure role-based access control:

1. Go to **Settings** → **Roles & Permissions**
2. Define roles:
   - **Admin**: Full system access
   - **Compliance Officer**: GRC module access
   - **IT Manager**: Asset and ticket management
   - **User**: Basic access to assigned items

### Session Management

Configure session security:

- **Session timeout**: 30 minutes of inactivity
- **Concurrent sessions**: Limit to 3 per user
- **Remember me**: 7 days maximum
- **Force logout**: On password change

### Encryption

Configure data encryption:

- **At rest**: Database encryption
- **In transit**: TLS 1.3 required
- **Backups**: Encrypted backup files

## Monitoring Configuration

### Health Checks

Set up system monitoring:

1. Go to **Settings** → **Monitoring**
2. Configure health checks:
   - **Database connectivity**
   - **API response times**
   - **Disk space usage**
   - **Memory utilization**

### Alerting

Configure alert thresholds:

- **CPU usage**: Alert at 80%
- **Memory usage**: Alert at 85%
- **Disk space**: Alert at 90%
- **API response time**: Alert over 5 seconds

### Log Aggregation

Set up centralized logging:

- **Application logs**: Structured JSON logging
- **System logs**: OS and container logs
- **Security logs**: Authentication and access logs

## Integration Configuration

### SSO Integration

Configure Single Sign-On:

1. Go to **Settings** → **Integrations** → **SSO**
2. Configure providers:
   - **SAML 2.0**: For enterprise identity providers
   - **OAuth 2.0**: For Google, Microsoft, etc.
   - **LDAP**: For Active Directory integration

### API Integrations

Set up external API connections:

- **SIEM Integration**: Security event correlation
- **CMDB Integration**: Configuration management database
- **Ticketing Systems**: Integration with ServiceNow, Jira
- **Monitoring Tools**: Integration with Nagios, Prometheus

## Performance Tuning

### Database Optimization

Optimize database performance:

```sql
-- Create indexes for common queries
CREATE INDEX idx_controls_owner ON activated_controls(owner_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_audit_timestamp ON audit_log(performed_at);

-- Configure PostgreSQL settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
```

### Application Performance

Tune application settings:

1. Go to **Settings** → **Performance**
2. Configure:
   - **Connection pooling**: Database connection limits
   - **Caching**: Redis for session and data caching
   - **Rate limiting**: API request throttling

## Compliance Configuration

### Regulatory Frameworks

Configure compliance frameworks:

1. Go to **Settings** → **Compliance Frameworks**
2. Enable frameworks:
   - **GDPR**: EU data protection
   - **SOX**: Financial reporting
   - **HIPAA**: Healthcare data
   - **PCI DSS**: Payment card data

### Automated Compliance

Set up automated compliance checks:

- **Control effectiveness**: Regular testing of controls
- **Evidence collection**: Automated evidence gathering
- **Gap analysis**: Identification of compliance gaps
- **Remediation tracking**: Monitoring of corrective actions

## Maintenance Tasks

### Regular Maintenance

Set up maintenance schedules:

1. **Daily**:
   - Log rotation
   - Backup verification
   - Health check monitoring

2. **Weekly**:
   - Database vacuum and analyze
   - Security patch updates
   - Performance monitoring

3. **Monthly**:
   - Full system backup testing
   - Compliance report generation
   - User access review

4. **Quarterly**:
   - Security assessment
   - Performance optimization
   - Disaster recovery testing

### Update Procedures

Configure update procedures:

1. **Test environment updates** first
2. **Staged rollout**: Update non-critical systems first
3. **Rollback plan**: Documented rollback procedures
4. **Change management**: Approved change windows

---

## Configuration Checklist

- [ ] Initial admin user setup and password change
- [ ] Email configuration and testing
- [ ] API key generation and distribution
- [ ] Control library population
- [ ] User roles and permissions setup
- [ ] Backup configuration and testing
- [ ] SSL certificate installation
- [ ] Firewall configuration
- [ ] Monitoring and alerting setup
- [ ] Integration testing with external systems

**Configuration completed!** ✅

Your GRC Platform is now fully configured and ready for production use.