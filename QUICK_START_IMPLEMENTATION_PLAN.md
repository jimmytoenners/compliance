# Quick Start Feature - Implementation Plan
**Feature:** Control Activation Templates for European Startups

**Status:** Design Complete, Implementation Pending  
**Target Completion:** November 2025  
**Estimated Time:** 2-3 days

---

## Overview

A guided "Quick Start" feature that helps European startups activate the most relevant compliance controls based on their maturity level. Three progressive tiers: **Getting Started** → **Move On** → **Master**.

### Benefits
- **Reduce time-to-compliance** from weeks to hours
- **Tailored for EU regulations** (GDPR, NIS-2, ISO 27001)
- **Progressive maturity model** that scales with company growth
- **One-click activation** of curated control sets

---

## Architecture

### Database Schema ✅ COMPLETE
Located in: `grc-backend/schema.sql` (lines added at end of file)

```sql
-- Already created in database:
CREATE TABLE control_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  maturity_level TEXT NOT NULL,
  recommended_for TEXT,
  estimated_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE template_controls (
  template_id TEXT NOT NULL REFERENCES control_templates(id) ON DELETE CASCADE,
  control_library_id TEXT NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  priority TEXT NOT NULL,
  rationale TEXT,
  PRIMARY KEY (template_id, control_library_id)
);
```

### Control Templates ✅ COMPLETE
Located in: `/Users/jimmy/dev/compliance/control-templates.json`

Three maturity levels defined:
1. **Getting Started** (15 controls) - Essential compliance for 1-10 employees
2. **Move On** (25 controls) - Growth & maturity for 10-50 employees
3. **Master** (35 controls) - Enterprise-grade for 50+ employees

---

## Implementation Steps

### Step 1: Backend - Template Data Loader
**File:** `grc-backend/seed.go`

Add function to load templates from JSON into database:

```go
func (s *Store) SeedControlTemplates(ctx context.Context) error {
    // Read control-templates.json
    file, err := os.ReadFile("../control-templates.json")
    if err != nil {
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
        return err
    }
    
    // Insert templates and template_controls
    for _, template := range data.Templates {
        // Insert into control_templates
        _, err := s.db.Exec(ctx, `
            INSERT INTO control_templates (id, name, description, maturity_level, recommended_for, estimated_time)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                maturity_level = EXCLUDED.maturity_level,
                recommended_for = EXCLUDED.recommended_for,
                estimated_time = EXCLUDED.estimated_time
        `, template.ID, template.Name, template.Description, template.MaturityLevel, 
           template.RecommendedFor, template.EstimatedTime)
        if err != nil {
            log.Printf("Failed to insert template %s: %v", template.ID, err)
            continue
        }
        
        // Insert template controls
        for _, control := range template.Controls {
            _, err := s.db.Exec(ctx, `
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
    
    log.Printf("Successfully seeded %d control templates", len(data.Templates))
    return nil
}
```

**Call in main.go:**
```go
// In RunServer() after SeedControlLibrary():
if err := store.SeedControlTemplates(ctx); err != nil {
    log.Printf("Warning: Failed to seed control templates: %v", err)
}
```

---

### Step 2: Backend - Template APIs
**File:** `grc-backend/store.go`

Add structs and functions:

```go
type ControlTemplate struct {
    ID             string    `json:"id" db:"id"`
    Name           string    `json:"name" db:"name"`
    Description    string    `json:"description" db:"description"`
    MaturityLevel  string    `json:"maturity_level" db:"maturity_level"`
    RecommendedFor string    `json:"recommended_for" db:"recommended_for"`
    EstimatedTime  string    `json:"estimated_time" db:"estimated_time"`
    ControlCount   int       `json:"control_count"`
    CreatedAt      time.Time `json:"created_at" db:"created_at"`
    UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

type TemplateControl struct {
    TemplateID       string `json:"template_id" db:"template_id"`
    ControlLibraryID string `json:"control_library_id" db:"control_library_id"`
    ControlName      string `json:"control_name" db:"name"`
    ControlFamily    string `json:"control_family" db:"family"`
    Priority         string `json:"priority" db:"priority"`
    Rationale        string `json:"rationale" db:"rationale"`
}

func (s *Store) GetControlTemplates(ctx context.Context) ([]ControlTemplate, error) {
    query := `
        SELECT 
            ct.id, ct.name, ct.description, ct.maturity_level, 
            ct.recommended_for, ct.estimated_time,
            COUNT(tc.control_library_id) as control_count,
            ct.created_at, ct.updated_at
        FROM control_templates ct
        LEFT JOIN template_controls tc ON ct.id = tc.template_id
        GROUP BY ct.id, ct.name, ct.description, ct.maturity_level, 
                 ct.recommended_for, ct.estimated_time, ct.created_at, ct.updated_at
        ORDER BY 
            CASE ct.maturity_level
                WHEN 'getting_started' THEN 1
                WHEN 'move_on' THEN 2
                WHEN 'master' THEN 3
                ELSE 4
            END
    `
    
    rows, err := s.db.Query(ctx, query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var templates []ControlTemplate
    for rows.Next() {
        var t ControlTemplate
        err := rows.Scan(&t.ID, &t.Name, &t.Description, &t.MaturityLevel,
            &t.RecommendedFor, &t.EstimatedTime, &t.ControlCount,
            &t.CreatedAt, &t.UpdatedAt)
        if err != nil {
            return nil, err
        }
        templates = append(templates, t)
    }
    
    if templates == nil {
        templates = make([]ControlTemplate, 0)
    }
    
    return templates, nil
}

func (s *Store) GetTemplateControls(ctx context.Context, templateID string) ([]TemplateControl, error) {
    query := `
        SELECT 
            tc.template_id, tc.control_library_id, tc.priority, tc.rationale,
            cl.name, cl.family
        FROM template_controls tc
        JOIN control_library cl ON tc.control_library_id = cl.id
        WHERE tc.template_id = $1
        ORDER BY 
            CASE tc.priority
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END,
            cl.id
    `
    
    rows, err := s.db.Query(ctx, query, templateID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var controls []TemplateControl
    for rows.Next() {
        var c TemplateControl
        err := rows.Scan(&c.TemplateID, &c.ControlLibraryID, &c.Priority, 
            &c.Rationale, &c.ControlName, &c.ControlFamily)
        if err != nil {
            return nil, err
        }
        controls = append(controls, c)
    }
    
    if controls == nil {
        controls = make([]TemplateControl, 0)
    }
    
    return controls, nil
}

func (s *Store) ActivateTemplateControls(ctx context.Context, templateID, ownerID string) (int, error) {
    // Get all controls in template
    controls, err := s.GetTemplateControls(ctx, templateID)
    if err != nil {
        return 0, err
    }
    
    activated := 0
    for _, control := range controls {
        // Check if already activated
        var exists bool
        err := s.db.QueryRow(ctx, 
            "SELECT EXISTS(SELECT 1 FROM activated_controls WHERE control_library_id = $1)",
            control.ControlLibraryID).Scan(&exists)
        if err != nil {
            log.Printf("Failed to check activation status for %s: %v", control.ControlLibraryID, err)
            continue
        }
        
        if exists {
            continue // Skip already activated controls
        }
        
        // Activate control with 90-day review interval
        nextReview := time.Now().AddDate(0, 0, 90)
        _, err = s.db.Exec(ctx, `
            INSERT INTO activated_controls (control_library_id, owner_id, status, review_interval_days, next_review_due_date)
            VALUES ($1, $2, 'active', 90, $3)
        `, control.ControlLibraryID, ownerID, nextReview)
        
        if err != nil {
            log.Printf("Failed to activate control %s: %v", control.ControlLibraryID, err)
            continue
        }
        
        activated++
    }
    
    return activated, nil
}
```

---

### Step 3: Backend - API Handlers
**File:** `grc-backend/handlers.go`

Add handlers:

```go
func (s *ApiServer) HandleGetTemplates(w http.ResponseWriter, r *http.Request) {
    templates, err := s.store.GetControlTemplates(r.Context())
    if err != nil {
        log.Printf("Failed to fetch templates: %v", err)
        http.Error(w, "Failed to fetch templates", http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{"templates": templates})
}

func (s *ApiServer) HandleGetTemplateControls(w http.ResponseWriter, r *http.Request) {
    templateID := mux.Vars(r)["id"]
    controls, err := s.store.GetTemplateControls(r.Context(), templateID)
    if err != nil {
        log.Printf("Failed to fetch template controls: %v", err)
        http.Error(w, "Failed to fetch template controls", http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{"controls": controls})
}

func (s *ApiServer) HandleActivateTemplate(w http.ResponseWriter, r *http.Request) {
    templateID := mux.Vars(r)["id"]
    userID := r.Context().Value(UserIDKey).(string)
    
    // Activate all controls in template
    count, err := s.store.ActivateTemplateControls(r.Context(), templateID, userID)
    if err != nil {
        log.Printf("Failed to activate template controls: %v", err)
        http.Error(w, "Failed to activate template", http.StatusInternalServerError)
        return
    }
    
    // Log audit
    entityType := "control_template"
    changes := map[string]interface{}{
        "template_id": templateID,
        "controls_activated": count,
    }
    s.store.LogAudit(r.Context(), &userID, "TEMPLATE_ACTIVATED", &entityType, &templateID, changes, nil)
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "status": "success",
        "template_id": templateID,
        "controls_activated": count,
    })
}
```

**Register routes in main.go:**
```go
// In RunServer() function:
// Template routes (all authenticated users can view, admins can activate)
r.Handle("/api/v1/templates", s.authMiddleware(http.HandlerFunc(s.HandleGetTemplates))).Methods("GET")
r.Handle("/api/v1/templates/{id}", s.authMiddleware(http.HandlerFunc(s.HandleGetTemplateControls))).Methods("GET")
r.Handle("/api/v1/templates/{id}/activate", s.authMiddleware(s.adminOnly(http.HandlerFunc(s.HandleActivateTemplate)))).Methods("POST")
```

---

### Step 4: Frontend - Quick Start Page
**File:** `grc-frontend-platform/src/app/(dashboard)/quick-start/page.tsx`

Create new page:

```typescript
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  TrendingUp,
  Trophy,
  CheckCircle,
  Clock,
  Users,
  Shield,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  maturity_level: string;
  recommended_for: string;
  estimated_time: string;
  control_count: number;
}

export default function QuickStartPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8080/api/v1/templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error("Failed to fetch templates");
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (templateId: string) => {
    if (!confirm("This will activate all controls in this template. Continue?")) {
      return;
    }

    setActivating(templateId);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/api/v1/templates/${templateId}/activate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to activate template");

      const result = await response.json();
      alert(`Successfully activated ${result.controls_activated} controls!`);
      router.push("/controls");
    } catch (err) {
      alert("Failed to activate template");
    } finally {
      setActivating(null);
    }
  };

  const getIcon = (level: string) => {
    switch (level) {
      case "getting_started": return <Rocket className="h-8 w-8" />;
      case "move_on": return <TrendingUp className="h-8 w-8" />;
      case "master": return <Trophy className="h-8 w-8" />;
      default: return <Shield className="h-8 w-8" />;
    }
  };

  const getColor = (level: string) => {
    switch (level) {
      case "getting_started": return "blue";
      case "move_on": return "orange";
      case "master": return "purple";
      default: return "gray";
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quick Start - European Startup Compliance
        </h1>
        <p className="text-gray-600">
          Choose a maturity level and activate curated controls tailored for EU startups
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-blue-900 font-semibold mb-1">How It Works</h3>
            <p className="text-blue-700 text-sm">
              Select a maturity level that matches your company size and compliance needs. 
              Clicking "Activate" will add all recommended controls to your compliance program. 
              You can customize and add more controls later.
            </p>
          </div>
        </div>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {templates.map((template) => {
          const color = getColor(template.maturity_level);
          const icon = getIcon(template.maturity_level);
          
          return (
            <div
              key={template.id}
              className={`bg-white border-2 border-${color}-200 rounded-lg p-6 hover:shadow-lg transition-all`}
            >
              {/* Icon & Title */}
              <div className={`flex items-center justify-center w-16 h-16 bg-${color}-100 rounded-full mb-4 mx-auto text-${color}-600`}>
                {icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                {template.name}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 min-h-[60px]">
                {template.description}
              </p>
              
              {/* Metadata */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm text-gray-700">
                  <Users className="h-4 w-4 mr-2 text-gray-500" />
                  {template.recommended_for}
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  {template.estimated_time}
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 mr-2 text-gray-500" />
                  {template.control_count} controls
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => handleActivate(template.id)}
                  disabled={activating !== null}
                  className={`w-full flex items-center justify-center px-4 py-2 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {activating === template.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Activating...
                    </>
                  ) : (
                    <>
                      Activate Template
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => router.push(`/quick-start/${template.id}`)}
                  className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Controls
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Step 5: Frontend - Template Detail Page
**File:** `grc-frontend-platform/src/app/(dashboard)/quick-start/[id]/page.tsx`

Create detail page to preview controls before activation.

---

### Step 6: Update Navigation
**File:** `grc-frontend-platform/src/components/Navigation.tsx`

Add Quick Start link:

```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Quick Start', href: '/quick-start' }, // ADD THIS
  { name: 'Controls', href: '/controls' },
  // ... rest of navigation
];
```

---

## Testing Checklist

- [ ] Templates load in database on backend startup
- [ ] GET /api/v1/templates returns all 3 templates
- [ ] GET /api/v1/templates/{id} returns controls for template
- [ ] POST /api/v1/templates/{id}/activate creates activated_controls
- [ ] Frontend displays 3 template cards with correct info
- [ ] Activation button works and redirects to controls page
- [ ] Activated controls show up in /controls page
- [ ] Audit log captures template activation events
- [ ] Already-activated controls are skipped (no duplicates)
- [ ] Controls are assigned to the activating user as owner

---

## Files Modified

### Backend
- `grc-backend/schema.sql` - Add template tables ✅ DONE
- `grc-backend/seed.go` - Add SeedControlTemplates()
- `grc-backend/store.go` - Add template structs and functions
- `grc-backend/handlers.go` - Add template API handlers
- `grc-backend/main.go` - Register template routes

### Frontend
- `grc-frontend-platform/src/app/(dashboard)/quick-start/page.tsx` - NEW
- `grc-frontend-platform/src/app/(dashboard)/quick-start/[id]/page.tsx` - NEW
- `grc-frontend-platform/src/components/Navigation.tsx` - Add link

### Data
- `/Users/jimmy/dev/compliance/control-templates.json` ✅ DONE

---

## Future Enhancements

1. **Template Customization** - Allow users to modify templates before activation
2. **Progress Tracking** - Show completion percentage for each template
3. **Template Recommendations** - Suggest next maturity level based on control completion
4. **Industry Templates** - Add FinTech, HealthTech, SaaS-specific templates
5. **Export Templates** - Allow users to export their activated controls as custom templates
6. **Template Analytics** - Track which templates are most popular

---

## Notes

- Control IDs in templates reference existing controls in control_library
- Some control IDs may not exist if not imported (e.g., GDPR-Art5, NIS2-Art6.1)
- Consider validating control IDs during template seeding
- Templates are read-only for users, admin-only for activation in this version
- Consider adding a "preview" mode before activation
- Review intervals default to 90 days for all activated controls

---

**Ready for Implementation:** This plan is complete and ready to execute. Follow steps 1-6 sequentially for fastest implementation.
