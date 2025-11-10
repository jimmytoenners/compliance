# GRC Platform User Manual

## Welcome to the GRC Platform

The GRC (Governance, Risk, and Compliance) Platform is a comprehensive solution for managing organizational compliance, risk, and governance activities. This manual provides guidance for both administrators and end-users.

## Getting Started

### Logging In

1. Open your web browser and navigate to your organization's GRC platform URL
2. Enter your email address and password
3. Click **Sign In**

If you forget your password, click **Forgot Password** and follow the reset instructions.

### Dashboard Overview

After logging in, you'll see the main dashboard with:

- **Compliance Statistics**: Overview of control status and compliance percentages
- **Recent Activity**: Latest tickets, control reviews, and notifications
- **Upcoming Deadlines**: Controls and tasks due soon
- **Quick Actions**: Shortcuts to common tasks

## User Roles and Permissions

### Administrator
Full access to all platform features including:
- User management
- System configuration
- Audit log viewing
- All compliance and ITSM functions

### Compliance Officer
Access to GRC-related features:
- Control management and evidence submission
- Risk assessments
- Compliance reporting
- Document management

### IT Manager
Access to technical features:
- Asset management
- Ticket management
- System monitoring
- Technical documentation

### Standard User
Basic access to assigned items:
- Personal controls and evidence submission
- Assigned tickets
- Personal documents and training

## GRC Module - Compliance Management

### Understanding Controls

Controls are the security measures and processes that help your organization meet compliance requirements. Each control has:

- **Status**: Compliant, Non-compliant, or Pending review
- **Owner**: Person responsible for the control
- **Review Frequency**: How often the control must be reviewed
- **Due Date**: When the next review is required

### Viewing Your Controls

1. Navigate to **Controls** in the main menu
2. You'll see a list of all controls in the library
3. Use filters to find specific controls:
   - By status (compliant, non-compliant, pending)
   - By owner
   - By framework (NIST, CIS, ISO, etc.)

### Submitting Evidence

When a control is due for review:

1. Go to **Controls** → Find your assigned control
2. Click **Submit Evidence**
3. Fill in the evidence form:
   - **Compliance Status**: Compliant or Non-compliant
   - **Notes**: Detailed explanation of your findings
   - **Evidence Link**: URL to supporting documentation (optional)
4. Click **Submit**

### Control Details

Click **View Details** on any control to see:
- Full control description and requirements
- Evidence history and previous submissions
- Review timeline and deadlines
- Related documents and assets

## ITSM Module - Ticket Management

### Understanding Tickets

Tickets are used to track requests, incidents, and tasks. Each ticket has:

- **Type**: Internal (staff-created) or External (customer-submitted)
- **Status**: New, Assigned, In Progress, Resolved, Closed
- **Priority**: Critical, High, Medium, Low
- **Category**: Security, Access, Compliance, etc.

### Creating Internal Tickets

1. Navigate to **Tickets** → **Create Ticket**
2. Fill in the ticket details:
   - **Title**: Brief description of the issue
   - **Description**: Detailed explanation
   - **Category**: Select appropriate category
   - **Priority**: Set urgency level
   - **Assign To**: Select responsible person (optional)
3. Click **Create Ticket**

### Managing Assigned Tickets

1. Go to **Tickets** → **My Tickets**
2. Click on a ticket to view details
3. Update status as work progresses:
   - **Assign** to yourself if unassigned
   - **Start Work** to begin resolution
   - **Add Comments** to document progress
   - **Resolve** when complete

### Ticket Comments and Collaboration

1. Open a ticket and scroll to the **Comments** section
2. Click **Add Comment**
3. Enter your message
4. Choose **Internal Note** if the comment should be hidden from external customers
5. Click **Post Comment**

## Asset Management

### Viewing Assets

1. Navigate to **Assets** in the main menu
2. Browse the asset registry
3. Use filters to find specific assets:
   - By type (server, database, application, etc.)
   - By owner
   - By status

### Asset Details

Click on any asset to view:
- Basic information (name, description, type)
- Ownership and contact information
- Related controls and compliance requirements
- Associated tickets and incidents

### Mapping Assets to Controls

1. Open an asset's detail page
2. Click **Map to Controls**
3. Select controls that apply to this asset
4. Click **Save Mapping**

This helps track which controls protect which assets.

## Document Management

### Accessing Documents

1. Go to **Documents** in the main menu
2. Browse available documents
3. Use search and filters to find specific documents

### Document Types

- **Policies**: Organizational security policies and procedures
- **Standards**: Technical standards and guidelines
- **Evidence**: Compliance evidence and audit reports
- **Training**: User guides and training materials

### Reading and Acknowledging Documents

Some documents require acknowledgment:

1. Open the document
2. Read the full content
3. Click **I Acknowledge** at the bottom
4. This confirms you've read and understood the document

### Document Versions

1. Click **View Versions** on any document
2. See the version history
3. Compare different versions if needed

## Notifications

### Notification Bell

The bell icon in the header shows unread notifications:

- **Control Due**: Reminders for upcoming control reviews
- **Ticket Updates**: Changes to tickets you're involved with
- **System Alerts**: Important system notifications

### Managing Notifications

1. Click the notification bell
2. Review unread notifications
3. Click on any notification to go to the relevant item
4. Mark notifications as read

## Reporting and Analytics

### Dashboard Metrics

The main dashboard shows key metrics:

- **Total Controls**: Number of controls in the system
- **Compliance Rate**: Percentage of compliant controls
- **Active Tickets**: Current open tickets
- **Overdue Items**: Controls and tasks past due

### Compliance Reports

Access detailed reports:

1. Go to **Reports** → **Compliance Status**
2. View compliance by framework, department, or time period
3. Export reports in PDF or Excel format

## GDPR ROPA Module (Admin Only)

### Record of Processing Activities

The GDPR ROPA module helps track data processing activities:

1. Navigate to **GDPR ROPA**
2. View all processing activities
3. Create new records for data processing operations
4. Archive completed activities

### ROPA Record Details

Each ROPA record includes:
- **Purpose**: Why data is being processed
- **Categories**: Types of personal data
- **Recipients**: Who receives the data
- **Retention**: How long data is kept
- **Security Measures**: Controls protecting the data

## Audit Log (Admin Only)

### Viewing System Activity

1. Go to **Audit** in the admin menu
2. View all system activities
3. Use filters to find specific events:
   - By user
   - By action type (create, update, delete)
   - By date range
   - By entity type

### Understanding Audit Entries

Each audit entry shows:
- **Timestamp**: When the action occurred
- **User**: Who performed the action
- **Action**: What was done (create, update, delete, login, etc.)
- **Entity**: What was affected
- **Changes**: What specifically changed

## Best Practices

### Control Management

- **Review Regularly**: Don't wait for due dates to review controls
- **Document Thoroughly**: Include detailed notes with your evidence
- **Link Evidence**: Attach or link to supporting documentation
- **Communicate Issues**: If a control is non-compliant, explain why and next steps

### Ticket Handling

- **Respond Quickly**: Acknowledge tickets within SLA timeframes
- **Update Status**: Keep ticket status current as work progresses
- **Document Resolution**: Include detailed resolution steps
- **Follow Up**: Ensure customers are satisfied with the resolution

### Security Awareness

- **Strong Passwords**: Use complex passwords and change them regularly
- **Secure Access**: Don't share credentials or leave sessions open
- **Report Issues**: Report suspicious activity or security concerns
- **Stay Updated**: Review security policies and procedures regularly

## Troubleshooting

### Common Issues

#### Can't Access the Platform
- Check your internet connection
- Verify the platform URL is correct
- Clear browser cache and cookies
- Try a different browser

#### Forgot Password
- Click **Forgot Password** on the login page
- Enter your email address
- Check your email for reset instructions
- Follow the secure link to set a new password

#### Control Won't Submit
- Ensure all required fields are filled
- Check file upload size limits
- Verify you have permission to submit for that control
- Contact your administrator if issues persist

#### Ticket Not Updating
- Refresh the page
- Check your internet connection
- Verify you have permission to update the ticket
- Contact support if the issue continues

### Getting Help

#### Self-Service Resources
- **Help Documentation**: Access this manual anytime
- **FAQ**: Check frequently asked questions
- **Video Tutorials**: Watch guided walkthroughs

#### Contacting Support
- **Internal Tickets**: Create tickets for technical issues
- **Email Support**: Contact the support team
- **Phone Support**: Call the help desk during business hours

## Keyboard Shortcuts

- **Ctrl/Cmd + K**: Quick search
- **Ctrl/Cmd + Enter**: Submit forms
- **Escape**: Close modals and dialogs
- **Tab**: Navigate through form fields
- **Ctrl/Cmd + S**: Save drafts (where available)

## Mobile Access

The platform is fully responsive and works on mobile devices:

- **Touch Gestures**: Swipe to navigate lists
- **Responsive Design**: Adapts to screen size
- **Mobile Notifications**: Receive push notifications (if enabled)
- **Offline Capability**: Limited offline functionality for evidence submission

## Compliance Training

### Required Training

Some organizations require compliance training:

1. Go to **Training** → **My Training**
2. View assigned training modules
3. Complete interactive training courses
4. Take quizzes to demonstrate understanding
5. Download certificates of completion

### Training Records

- **Completion Tracking**: System tracks all completed training
- **Expiration Alerts**: Notifications for expiring certifications
- **Audit Trail**: Full record of training history

## Data Privacy

### Your Data Rights

- **Access**: Request access to your personal data
- **Rectification**: Request correction of inaccurate data
- **Erasure**: Request deletion of your data ("right to be forgotten")
- **Portability**: Request your data in a portable format

### Privacy Settings

1. Go to **Settings** → **Privacy**
2. Configure data sharing preferences
3. Manage notification preferences
4. Review data processing consents

## System Maintenance

### Scheduled Maintenance

The platform may have scheduled maintenance windows:

- **Notification**: You'll receive advance notice of maintenance
- **Timing**: Typically during off-hours (e.g., weekends)
- **Duration**: Usually 1-4 hours
- **Communication**: Status updates during maintenance

### Emergency Maintenance

In case of security issues or critical bugs:

- **Immediate Notification**: Via email and platform alerts
- **Temporary Downtime**: May be required for fixes
- **Status Updates**: Regular updates on progress

## Glossary

### Common Terms

- **Control**: A security measure or process
- **Evidence**: Proof that a control is working
- **Compliance**: Meeting regulatory requirements
- **Risk**: Potential for negative outcomes
- **Ticket**: A request or incident report
- **Asset**: A system, application, or data resource
- **Framework**: A set of standards (e.g., NIST, CIS, ISO)
- **SLA**: Service Level Agreement for response times
- **Audit**: Independent review of compliance
- **GDPR**: EU General Data Protection Regulation
- **ROPA**: Record of Processing Activities

## Support Contact Information

- **Help Desk**: help@yourcompany.com
- **Phone**: 1-800-HELP-NOW
- **Hours**: Monday-Friday, 8 AM - 6 PM EST
- **Emergency**: For critical system issues, call emergency line

---

**Thank you for using the GRC Platform!**

Your active participation in compliance activities helps keep our organization secure and compliant. If you have questions or suggestions for improving this manual, please contact the support team.