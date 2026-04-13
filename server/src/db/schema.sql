-- Create ENUM types
CREATE TYPE application_status AS ENUM (
  'active',
  'waitlisted',
  'hired',
  'rejected',
  'withdrawn'
);

CREATE TYPE job_status AS ENUM (
  'open',
  'closed'
);

-- Tables
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  active_capacity INTEGER NOT NULL CHECK (active_capacity > 0),
  decay_window_hours INTEGER NOT NULL DEFAULT 48,
  status job_status DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applicants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'waitlisted',
  decay_level INTEGER DEFAULT 0,
  decay_count INTEGER DEFAULT 0,
  status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  promoted_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, applicant_id)
);

CREATE TABLE state_transition_logs (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status application_status,
  to_status application_status NOT NULL,
  reason VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_applications_job_status ON applications(job_id, status);
CREATE INDEX idx_applications_job_queue ON applications(job_id, decay_level, created_at);
CREATE INDEX idx_applications_promoted ON applications(promoted_at)
  WHERE status = 'active' AND acknowledged_at IS NULL;
CREATE INDEX idx_logs_application ON state_transition_logs(application_id);
CREATE INDEX idx_logs_created ON state_transition_logs(created_at);