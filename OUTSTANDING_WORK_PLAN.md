# Outstanding Work Plan - GRC Platform
**Created:** 2025-11-10  
**Status:** Ready for Implementation

## Executive Summary

Based on analysis of the Blueprint, Work Breakdown Structure, and current codebase, this document outlines all remaining work to complete the GRC & ITSM Platform as specified.

### Current Completion Status
- ✅ **Phase 0:** Foundation & Project Setup - COMPLETE
- ✅ **Phase 2:** Core Backend & GRC Module - PARTIALLY COMPLETE (70%)
- ✅ **Phase 3:** Core Frontend (GRC Module) - PARTIALLY COMPLETE (40%)
- ⚠️ **Phase 4:** ITSM Module - PARTIALLY COMPLETE (30%)
- ❌ **Phase 5:** Supporting Modules (Docs & Assets) - NOT STARTED
- ❌ **Phase 5.5:** GDPR ROPA Module - NOT STARTED
- ❌ **Phase 6:** Proactive Systems & Integration - PARTIALLY COMPLETE (20%)
- ✅ **Phase 7:** Quality Assurance & E2E Testing - COMPLETE
- ⚠️ **Phase 8:** Packaging & Documentation - PARTIALLY COMPLETE (50%)

---

## Critical Outstanding Items (Priority 1)

### 1. Audit Logging System (Blueprint Part 1.4)
**Status:** Table exists, but not integrated  
**Estimated Effort:** 48 hours  
**Location:** `grc-backend/handlers.go` has 6 TODO comments

**Tasks:**
- [ ] Create `LogAudit()` helper function in `store.go`
- [ ] Refactor all CREATE/UPDATE/DELETE operations to call `LogAudit()`
- [ ] Add audit logging to:
  - User authentication (login/logout)
  - Control activation/deactivation
  - Evidence submission
  - Ticket creation/updates
  - Document publishing
  - Asset management
- [ ] Create admin API endpoint: `GET /api/v1/audit/logs`
- [ ] Build frontend audit log viewer (admin-only)

### 2. Authentication & RBAC Middleware (Blueprint Part 1.5)
**Status:** Basic auth exists, RBAC not enforced  
**Estimated Effort:** 32 hours

**Tasks:**
- [ ] Implement JWT middleware in Go
- [ ] Add role-based access control checks to all handlers
- [ ] Enforce admin-only endpoints (activate controls, create documents, etc.)
- [ ] Implement conditional access for users (only see their tickets/controls)
- [ ] Add API key authentication for external portal
- [ ] Test all permission scenarios

### 3. Notification System (Blueprint Part 7)
**Status:** Table exists, no implementation  
**Estimated Effort:** 32 hours

**Tasks:**
- [ ] Create cron job/background worker in Go
- [ ] Implement logic to scan `activated_controls` for upcoming due dates
- [ ] Create notifications for control owners
- [ ] Implement `GET /api/v1/notifications` endpoint
- [ ] Implement `POST /api/v1/notifications/{id}/read` endpoint
- [ ] Build frontend notification bell component
- [ ] Add notification badge with unread count

---

## Module Completion Items (Priority 2)

### 4. GRC Module - Missing Features
**Estimated Effort:** 64 hours

**Backend:**
- [ ] `PUT /api/v1/controls/activated/{id}` - Update control (change owner/interval)
- [ ] `DELETE /api/v1/controls/activated/{id}` - Deactivate (soft-delete)
- [ ] `GET /api/v1/controls/activated/{id}/evidence` - Evidence history
- [ ] Add NIS 2, eIDAS, and SOC 2 control libraries to seeder
- [ ] Create control library JSON/CSV files for new standards

**Frontend:**
- [ ] Control detail view page
- [ ] Evidence history page
- [ ] Control deactivation UI
- [ ] Edit control settings (owner, interval)
- [ ] Filter/search controls by framework
- [ ] Compliance status dashboard charts

### 5. ITSM Module - Missing Features  
**Estimated Effort:** 120 hours

**Backend:**
- [ ] `PUT /api/v1/tickets/{id}` - Update ticket status/assignment
- [ ] `DELETE /api/v1/tickets/{id}` - Soft-delete (invalidate)
- [ ] `GET /api/v1/tickets` - Add filtering (by type, status, assigned user)
- [ ] `POST /api/v1/tickets/{id}/comments` - Comments system
- [ ] `GET /api/v1/tickets/{id}` - Include comments in response
- [ ] Implement `is_internal_note` filtering for external API
- [ ] Create external portal API endpoints with API key auth

**Frontend (Platform):**
- [ ] Ticket list with filters and search
- [ ] Ticket detail page with full comment thread
- [ ] Update ticket status/assignment UI
- [ ] Add internal notes functionality
- [ ] Link tickets to controls/assets/documents
- [ ] Ticket board/kanban view

**Frontend (Portal):**
- [ ] Customer ticket submission form
- [ ] "My Tickets" list view
- [ ] Ticket detail with public comments only
- [ ] External customer authentication

### 6. Document Management Module (Blueprint Part 4)
**Status:** NOT STARTED  
**Estimated Effort:** 120 hours

**Backend:**
- [ ] `POST /api/v1/documents` - Create document container
- [ ] `GET /api/v1/documents` - List all documents
- [ ] `GET /api/v1/documents/{id}` - Get document with published version
- [ ] `POST /api/v1/documents/{id}/versions` - Create draft version
- [ ] `PUT /api/v1/documents/{doc_id}/versions/{version_id}/publish` - Publish version
- [ ] `GET /api/v1/documents/{id}/versions` - Version history
- [ ] `POST /api/v1/versions/{id}/acknowledge` - User acknowledgment
- [ ] `POST /api/v1/mappings/document-to-control` - Map doc to control
- [ ] `DELETE /api/v1/mappings/document-to-control` - Remove mapping

**Frontend:**
- [ ] Document list page
- [ ] Document editor with rich text (e.g., TipTap, Quill)
- [ ] Version history viewer
- [ ] "Read & Acknowledge" workflow
- [ ] Document-to-control mapping UI
- [ ] Publish/archive document workflows

### 7. Asset Management Module (Blueprint Part 5)
**Status:** Table exists, no implementation  
**Estimated Effort:** 80 hours

**Backend:**
- [ ] `POST /api/v1/assets` - Create asset
- [ ] `GET /api/v1/assets` - List assets
- [ ] `GET /api/v1/assets/{id}` - Get asset details
- [ ] `PUT /api/v1/assets/{id}` - Update asset
- [ ] `DELETE /api/v1/assets/{id}` - Soft-delete (decommission)
- [ ] `POST /api/v1/mappings/asset-to-control` - Map asset to control
- [ ] `DELETE /api/v1/mappings/asset-to-control` - Remove mapping

**Frontend:**
- [ ] Asset registry (list/grid view)
- [ ] Create/edit asset form
- [ ] Asset detail page showing linked controls and tickets
- [ ] Asset-to-control mapping UI
- [ ] Asset status management

### 8. GDPR ROPA Module (Blueprint Part 10)
**Status:** Table exists, no implementation  
**Estimated Effort:** 56 hours

**Backend:**
- [ ] `POST /api/v1/gdpr/ropa` - Create processing activity
- [ ] `GET /api/v1/gdpr/ropa` - List all activities
- [ ] `PUT /api/v1/gdpr/ropa/{id}` - Update activity
- [ ] `DELETE /api/v1/gdpr/ropa/{id}` - Soft-delete (archive)

**Frontend:**
- [ ] ROPA list/table view
- [ ] Create/edit ROPA record form
- [ ] Export ROPA to PDF for auditors
- [ ] Status management (draft/active/archived)

---

## Dashboard & Reporting (Priority 3)

### 9. Enhanced Dashboard
**Estimated Effort:** 40 hours

**Backend:**
- [x] `GET /api/v1/dashboard/summary` - IMPLEMENTED
- [ ] Add more detailed metrics:
  - Controls by framework breakdown
  - Compliance score over time
  - Ticket resolution metrics
  - User activity stats

**Frontend:**
- [ ] Main dashboard page with cards/charts
- [ ] Implement charts using library (e.g., Recharts, Chart.js)
- [ ] Real-time updates for notifications
- [ ] Quick actions widget
- [ ] Recently viewed items

---

## Frontend Pages Still Needed

### Platform (Internal)
- [ ] `/documents` - Document library
- [ ] `/documents/{id}` - Document detail/editor
- [ ] `/assets` - Asset registry
- [ ] `/assets/{id}` - Asset detail
- [ ] `/audit` - Audit log viewer (admin)
- [ ] `/gdpr/ropa` - GDPR ROPA register
- [ ] `/users` - User management (admin)
- [ ] `/settings` - Application settings

### Portal (External)
- [ ] `/` - Landing/login page
- [ ] `/tickets/new` - Submit ticket form
- [ ] `/tickets` - My tickets list
- [ ] `/tickets/{id}` - Ticket detail

---

## Testing & Quality

### 10. Test Coverage Improvements
**Estimated Effort:** 40 hours

- [ ] Add unit tests for new backend handlers
- [ ] Add frontend component tests for new pages
- [ ] Create E2E tests for complete user journeys:
  - Admin activates control → User submits evidence
  - User creates ticket → Admin responds
  - Admin publishes document → User acknowledges
  - External customer submits ticket → Admin resolves
- [ ] Test RBAC enforcement
- [ ] Test audit logging accuracy

---

## Documentation Updates

### 11. Documentation Completion
**Estimated Effort:** 32 hours

- [ ] Update USER_MANUAL.md with all features
- [ ] Complete CONFIGURATION.md with all environment variables
- [ ] Update INSTALLATION.md with troubleshooting section
- [ ] Create API documentation (Swagger/OpenAPI)
- [ ] Add inline code documentation
- [ ] Create architecture diagrams
- [ ] Document deployment procedures

---

## Implementation Roadmap

### Sprint 1 (2 weeks - 80 hours)
**Focus:** Critical infrastructure
- Audit logging system
- RBAC enforcement
- Notification system

### Sprint 2 (2 weeks - 80 hours)
**Focus:** Complete GRC module
- Evidence history
- Control management features
- Compliance dashboard

### Sprint 3 (2 weeks - 80 hours)
**Focus:** ITSM completion
- Ticket updates/comments
- Internal/external separation
- Portal basic functionality

### Sprint 4 (2 weeks - 80 hours)
**Focus:** Document management
- Document CRUD operations
- Version control
- Read & acknowledge

### Sprint 5 (2 weeks - 80 hours)
**Focus:** Asset & GDPR modules
- Asset registry
- Asset-control mapping
- GDPR ROPA register

### Sprint 6 (2 weeks - 80 hours)
**Focus:** Dashboard & reporting
- Enhanced dashboard
- Charts and metrics
- Notification UI

### Sprint 7 (1 week - 40 hours)
**Focus:** Testing & polish
- E2E test coverage
- Bug fixes
- UI/UX refinements

### Sprint 8 (1 week - 40 hours)
**Focus:** Documentation
- Complete all docs
- API documentation
- Video tutorials

---

## Estimated Total Remaining Effort

| Category | Hours |
|----------|-------|
| Critical Infrastructure | 112 |
| Module Completion | 440 |
| Dashboard & Reporting | 40 |
| Testing | 40 |
| Documentation | 32 |
| **TOTAL** | **664 hours** |

**Timeline:** ~17 weeks with 1 full-time developer, or ~8.5 weeks with 2 developers

---

## Quick Wins (Can be done immediately)

1. **Add missing API endpoints** - Many are simple CRUD operations
2. **Implement audit logging** - Core infrastructure that affects all modules
3. **Build notification system** - Makes platform proactive
4. **Complete ITSM module** - Most of the infrastructure is already there
5. **Create dashboard visualizations** - Backend endpoint exists

---

## Technical Debt Items

1. **Replace middleware deprecation warning** - Next.js middleware convention is deprecated
2. **Add proper JWT token validation** - Currently using mock tokens
3. **Implement proper password hashing** - Using simplified auth
4. **Add rate limiting** - Protect external portal endpoints
5. **Add database connection pooling optimization**
6. **Add caching layer** for frequently accessed data
7. **Implement proper error handling** and user-friendly error messages
8. **Add request/response validation** with JSON schemas
9. **Implement database backup strategy**
10. **Add monitoring and logging infrastructure** (e.g., Prometheus, Grafana)

---

## Notes

- All database tables are already created
- Authentication foundation is in place
- Core GRC functionality works end-to-end
- Test infrastructure is solid (Playwright)
- Docker setup is complete
- Most missing work is implementing additional CRUD operations and connecting frontend pages

## References

- Blueprint: `/Users/jimmy/dev/compliance/Blueprint.txt`
- WBS: `/Users/jimmy/dev/compliance/WorkBreakdownStructure.txt`
- Current Progress: `/Users/jimmy/dev/compliance/MASTER_PROGRESS.md`
