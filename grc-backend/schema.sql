-- ### 0. PREPARATION ###
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ### 1. GRC & USER TABLES ###

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user', 'admin'
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  company_name TEXT,
  company_size TEXT, -- '1-10', '11-50', '51-200', '201-500', '500+'
  company_industry TEXT,
  primary_regulations TEXT, -- Comma-separated: 'GDPR,ISO27001,NIS-2'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Standards metadata table
CREATE TABLE control_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE, -- e.g., 'CIS-v8', 'ISO-27001-2022'
  name TEXT NOT NULL, -- e.g., 'CIS Controls Version 8'
  version TEXT NOT NULL, -- e.g., '8.0', '2022'
  organization TEXT NOT NULL, -- e.g., 'Center for Internet Security', 'ISO/IEC'
  published_date DATE,
  description TEXT,
  website_url TEXT,
  total_controls INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_timestamp BEFORE UPDATE ON control_standards FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE control_library (
  id TEXT PRIMARY KEY, -- e.g., 'CIS-4.1'
  standard TEXT NOT NULL, -- e.g., 'CIS v8 IG1'
  standard_id UUID REFERENCES control_standards(id) ON DELETE SET NULL, -- NEW: Link to standard metadata
  family TEXT NOT NULL, -- e.g., 'Access Control Management'
  name TEXT NOT NULL, -- e.g., 'Password Management'
  description TEXT NOT NULL
);

-- Full article/specification text for controls
CREATE TABLE control_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_library_id TEXT NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  standard_id UUID REFERENCES control_standards(id) ON DELETE CASCADE,
  article_number TEXT, -- e.g., '5.1', 'A.5.1'
  section_name TEXT, -- e.g., 'Policies for information security'
  full_text TEXT NOT NULL, -- Complete specification text
  guidance TEXT, -- Implementation guidance
  external_references TEXT, -- External references, standards, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(control_library_id, standard_id)
);
CREATE TRIGGER set_timestamp BEFORE UPDATE ON control_articles FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE activated_controls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_library_id TEXT NOT NULL REFERENCES control_library(id),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  review_interval_days INTEGER NOT NULL DEFAULT 90,
  last_reviewed_at TIMESTAMPTZ,
  next_review_due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_timestamp BEFORE UPDATE ON activated_controls FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE control_evidence_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activated_control_id UUID NOT NULL REFERENCES activated_controls(id) ON DELETE CASCADE,
  performed_by_id UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  compliance_status TEXT NOT NULL, -- 'compliant', 'non-compliant'
  notes TEXT,
  evidence_link TEXT
);

-- Evidence file attachments
CREATE TABLE evidence_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_log_id UUID NOT NULL REFERENCES control_evidence_log(id) ON DELETE CASCADE,
  filename TEXT NOT NULL, -- Original filename
  stored_filename TEXT NOT NULL UNIQUE, -- UUID-based filename on disk
  file_size BIGINT NOT NULL, -- Size in bytes
  content_type TEXT NOT NULL, -- MIME type (e.g., 'application/pdf', 'image/png')
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_evidence_files_evidence_log ON evidence_files(evidence_log_id);

-- ### 2. DOCUMENT & ASSET TABLES ###

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'Policy', 'Procedure'
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  published_version_id UUID, -- Deferrable FK defined below
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_timestamp BEFORE UPDATE ON documents FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  body_content TEXT NOT NULL,
  change_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add the circular foreign key for published version
ALTER TABLE documents
ADD CONSTRAINT fk_published_version
FOREIGN KEY (published_version_id)
REFERENCES document_versions(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE document_read_acknowledgements (
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (document_version_id, user_id)
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'Server', 'Software'
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'decommissioned'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_timestamp BEFORE UPDATE ON assets FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- ### 3. MAPPING & ITSM TABLES ###

CREATE TABLE document_control_mapping (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  activated_control_id UUID NOT NULL REFERENCES activated_controls(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, activated_control_id)
);

CREATE TABLE asset_control_mapping (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  activated_control_id UUID NOT NULL REFERENCES activated_controls(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, activated_control_id)
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequential_id SERIAL UNIQUE, -- Human-readable ID (T-1001)
  ticket_type TEXT NOT NULL, -- 'internal' or 'external'
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'in_progress', 'resolved', 'invalidated'
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  external_customer_ref TEXT,
  activated_control_id UUID REFERENCES activated_controls(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE TRIGGER set_timestamp BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT false, -- CRITICAL: Hides from customer
  comment_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  external_customer_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ### 4. SYSTEM TABLES ###

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_entity_type TEXT,
  target_entity_id TEXT,
  changes JSONB,
  ip_address INET
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  link_url TEXT, -- e.g., '/controls/activated/uuid-...'
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ### 5. NEW EU COMPLIANCE TABLES (GDPR) ###

CREATE TABLE gdpr_ropa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_name TEXT NOT NULL,
  department TEXT,
  data_controller_details TEXT NOT NULL,
  data_categories TEXT NOT NULL,
  data_subject_categories TEXT NOT NULL,
  recipients TEXT,
  third_country_transfers TEXT,
  retention_period TEXT,
  security_measures TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'archived'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON gdpr_ropa
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- ### 6. RISK MANAGEMENT TABLES ###

CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- 'Operational', 'Financial', 'Strategic', 'Compliance', 'Technical'
  likelihood INTEGER NOT NULL CHECK (likelihood >= 1 AND likelihood <= 5), -- 1=Very Low, 5=Very High
  impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5), -- 1=Negligible, 5=Catastrophic
  risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED, -- Calculated: 1-25
  status TEXT NOT NULL DEFAULT 'identified', -- 'identified', 'assessed', 'mitigated', 'accepted', 'closed'
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  mitigation_plan TEXT,
  residual_likelihood INTEGER CHECK (residual_likelihood >= 1 AND residual_likelihood <= 5),
  residual_impact INTEGER CHECK (residual_impact >= 1 AND residual_impact <= 5),
  residual_risk_score INTEGER GENERATED ALWAYS AS (COALESCE(residual_likelihood, likelihood) * COALESCE(residual_impact, impact)) STORED,
  review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_timestamp BEFORE UPDATE ON risk_assessments FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE risk_control_mapping (
  risk_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
  activated_control_id UUID NOT NULL REFERENCES activated_controls(id) ON DELETE CASCADE,
  PRIMARY KEY (risk_id, activated_control_id)
);

-- ### 7. GDPR DATA SUBJECT REQUEST (DSR) TABLES ###

CREATE TABLE gdpr_dsr (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_type TEXT NOT NULL, -- 'access', 'erasure', 'rectification', 'portability', 'restriction', 'objection'
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  data_subject_info TEXT NOT NULL, -- Details to identify the data subject
  request_details TEXT, -- Additional information about the request
  status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'under_review', 'in_progress', 'completed', 'rejected'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deadline_date DATE NOT NULL, -- GDPR requires response within 30 days (can be extended to 90)
  completed_date TIMESTAMPTZ,
  response_summary TEXT, -- Summary of actions taken
  rejection_reason TEXT, -- If status is 'rejected', reason for rejection
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_timestamp BEFORE UPDATE ON gdpr_dsr FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Vendor Risk Management Module
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- e.g., IT Services, Cloud Provider, Payment Processor
    risk_tier VARCHAR(50) NOT NULL DEFAULT 'medium', -- critical, high, medium, low
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, under_review, terminated
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website VARCHAR(500),
    contract_start_date DATE,
    contract_end_date DATE,
    contract_value DECIMAL(15,2),
    last_assessment_date DATE,
    next_assessment_due DATE,
    owner_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assessor_id UUID REFERENCES users(id),
    overall_risk_score INT CHECK (overall_risk_score BETWEEN 1 AND 25),
    data_security_score INT CHECK (data_security_score BETWEEN 1 AND 5),
    compliance_score INT CHECK (compliance_score BETWEEN 1 AND 5),
    financial_stability_score INT CHECK (financial_stability_score BETWEEN 1 AND 5),
    operational_capability_score INT CHECK (operational_capability_score BETWEEN 1 AND 5),
    findings TEXT,
    recommendations TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, completed, approved
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_control_mapping (
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    activated_control_id UUID NOT NULL REFERENCES activated_controls(id) ON DELETE CASCADE,
    PRIMARY KEY (vendor_id, activated_control_id)
);

CREATE TABLE IF NOT EXISTS vendor_document_mapping (
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_type VARCHAR(100), -- e.g., Contract, SLA, SOC2, ISO27001, DPA
    PRIMARY KEY (vendor_id, document_id)
);

CREATE TRIGGER set_timestamp_vendors
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_vendor_assessments
BEFORE UPDATE ON vendor_assessments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ### 8. CONTROL ACTIVATION TEMPLATES ###

CREATE TABLE control_templates (
  id TEXT PRIMARY KEY, -- e.g., 'eu-startup-foundation'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  maturity_level TEXT NOT NULL, -- 'foundation', 'growth', 'enterprise'
  recommended_for TEXT,
  estimated_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_timestamp BEFORE UPDATE ON control_templates FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE template_controls (\n  template_id TEXT NOT NULL REFERENCES control_templates(id) ON DELETE CASCADE,
  control_library_id TEXT NOT NULL REFERENCES control_library(id) ON DELETE CASCADE,
  priority TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  rationale TEXT,
  PRIMARY KEY (template_id, control_library_id)
);
