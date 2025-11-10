# GRC Platform - Governance, Risk & Compliance

A comprehensive enterprise GRC (Governance, Risk & Compliance) platform built with Go, PostgreSQL, and Next.js. Manage controls, risks, vendors, GDPR compliance, and more through an intuitive web interface.

## 🚀 Features

### Core Modules (Priority 1-6 Complete)

- **Control Management** - GRC control library with activation, evidence submission, and review workflows
- **Asset Management** - IT asset inventory with control mapping
- **Document Management** - Policy & procedure versioning with acknowledgment tracking
- **ITSM (IT Service Management)** - Internal and external ticket system with comment threads
- **Risk Assessment** - 5×5 risk matrix with inherent/residual risk tracking
- **Vendor Risk Management** - Third-party vendor lifecycle and risk assessment
- **GDPR ROPA** - Record of Processing Activities per GDPR Article 30
- **GDPR DSR** - Data Subject Request management with 30-day deadline tracking
- **Analytics & Reporting** - Executive dashboards with compliance trends, risk distribution, and metrics
- **Audit Logging** - Complete audit trail for all system operations
- **Notifications** - Real-time notifications for due controls and system events

### Security & Compliance

- ✅ JWT-based authentication with RBAC (Role-Based Access Control)
- ✅ Admin and user role separation
- ✅ GDPR compliance features (ROPA, DSR, 30-day deadlines)
- ✅ Comprehensive audit logging with IP tracking
- ✅ Password-protected API endpoints
- ✅ CORS-enabled for frontend integration

## 🏗️ Architecture

```
compliance/
├── grc-backend/              # Go API server (Port 8080)
│   ├── main.go              # Server setup & routing
│   ├── handlers.go          # API handlers (2280 lines)
│   ├── store.go             # Database operations (2772 lines)
│   ├── middleware.go        # JWT auth & RBAC
│   ├── cron.go              # Scheduled jobs
│   └── schema.sql           # PostgreSQL schema
│
├── grc-frontend-platform/   # Next.js admin app (Port 3040)
│   └── src/app/
│       ├── (dashboard)/     # Protected routes
│       │   ├── dashboard/
│       │   ├── controls/
│       │   ├── assets/
│       │   ├── documents/
│       │   ├── tickets/
│       │   ├── risks/
│       │   ├── vendors/     # NEW
│       │   ├── gdpr/ropa/
│       │   ├── gdpr/dsr/
│       │   ├── reports/
│       │   └── audit/
│       └── login/
│
└── grc-frontend-portal/     # Next.js customer portal (Port 3050)
    └── External ticket submission
```

## 📊 Database Schema

**22 Tables:**
- users, control_library, activated_controls, control_evidence_log
- assets, asset_control_mapping
- documents, document_versions, document_acknowledgments, document_control_mapping
- tickets, ticket_comments
- risk_assessments, risk_control_mapping
- vendors, vendor_assessments, vendor_control_mapping, vendor_document_mapping
- gdpr_ropa, gdpr_dsr
- audit_log, notifications

## 🛠️ Tech Stack

**Backend:**
- Go 1.21+
- PostgreSQL 14+
- gorilla/mux (routing)
- jackc/pgx (PostgreSQL driver)
- golang-jwt/jwt (authentication)

**Frontend:**
- Next.js 16.0.1
- React 19
- TypeScript
- Tailwind CSS v4
- Radix UI components
- Recharts (analytics)
- Zustand (state management)

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Go 1.21+
- Node.js 18+
- PostgreSQL 14+

### 1. Start Database

```bash
docker-compose up db -d
```

### 2. Initialize Database

```bash
cd grc-backend
PGPASSWORD=grc_password psql -h localhost -p 5444 -U grc_user -d grc_db -f schema.sql
```

### 3. Start Backend

```bash
cd grc-backend
DATABASE_URL=postgres://grc_user:grc_password@localhost:5444/grc_db \
JWT_SECRET=your-secret-key \
API_PORT=8080 \
go run .
```

### 4. Start Frontend

```bash
# Admin Platform
cd grc-frontend-platform
npm install
npm run dev  # Port 3040

# Customer Portal
cd grc-frontend-portal
npm install
npm run dev  # Port 3050
```

### 5. Access Applications

- **Admin Platform:** http://localhost:3040
- **Customer Portal:** http://localhost:3050
- **Backend API:** http://localhost:8080

**Default Credentials:**
- Email: `admin@company.com`
- Password: `admin123`

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with email/password

### Controls
- `GET /api/v1/controls/library` - List control library
- `POST /api/v1/controls/activated` - Activate control (admin)
- `GET /api/v1/controls/activated` - List activated controls

### Assets
- `GET /api/v1/assets` - List assets
- `POST /api/v1/assets` - Create asset (admin)
- `GET /api/v1/assets/{id}/controls` - Get linked controls

### Risks
- `GET /api/v1/risks` - List risk assessments
- `POST /api/v1/risks` - Create risk (admin)
- `GET /api/v1/risks/{id}/controls` - Get linked controls

### Vendors
- `GET /api/v1/vendors` - List vendors
- `POST /api/v1/vendors` - Create vendor (admin)
- `GET /api/v1/vendors/{id}/assessments` - Get risk assessments
- `POST /api/v1/vendors/{id}/assessments` - Create assessment (admin)

### GDPR
- `GET /api/v1/gdpr/ropa` - List processing activities
- `GET /api/v1/gdpr/dsr` - List data subject requests
- `POST /api/v1/gdpr/dsr/public` - Submit DSR (public, no auth)

### Analytics
- `GET /api/v1/analytics/control-compliance-trends` - Compliance trends
- `GET /api/v1/analytics/risk-distribution` - Risk distribution by severity
- `GET /api/v1/analytics/dsr-metrics` - GDPR DSR metrics

## 📈 Development

### Run Tests

```bash
cd grc-frontend-platform
npm run test:e2e
```

### Build for Production

```bash
# Backend
cd grc-backend
go build -o grc-server .

# Frontend
cd grc-frontend-platform
npm run build
```

## 📝 Documentation

- [Master Progress](MASTER_PROGRESS.md) - Complete development log
- [Installation Guide](INSTALLATION.md) - Detailed setup instructions
- [User Manual](USER_MANUAL.md) - End-user documentation
- [Configuration](CONFIGURATION.md) - Environment variables & settings

## 🎯 Project Status

**ALL PRIORITY 6 FEATURES COMPLETE** ✅

- ✅ Priority 1: Core GRC features
- ✅ Priority 2: Asset Management, ITSM, Notifications
- ✅ Priority 3: Document Management
- ✅ Priority 4: GDPR ROPA Module
- ✅ Priority 5: Risk Assessment Module
- ✅ Priority 6: Vendor Risk Management
- ✅ Priority 6: Enhanced Analytics Dashboard
- ✅ Priority 6: GDPR DSR Module

**Total Lines of Code:**
- Backend: ~5,052 lines (Go)
- Frontend Platform: ~8,000+ lines (TypeScript/React)
- Frontend Portal: ~1,500 lines (TypeScript/React)

## 📄 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. Contact the maintainer for contribution guidelines.

## 📧 Support

For questions or issues, please contact the development team.

---

**Built with ❤️ for enterprise GRC compliance**
