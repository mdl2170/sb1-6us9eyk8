-- Drop existing types if they exist
DO $$
BEGIN
    DROP TYPE IF EXISTS application_status CASCADE;
    DROP TYPE IF EXISTS company_size CASCADE;
    DROP TYPE IF EXISTS work_location CASCADE;
    DROP TYPE IF EXISTS interaction_type CASCADE;
    DROP TYPE IF EXISTS interaction_method CASCADE;
END$$;

-- Create enums for various status and type fields
CREATE TYPE application_status AS ENUM (
  'draft', 'applied', 'screening', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn'
);

CREATE TYPE company_size AS ENUM (
  'startup', 'small', 'midsize', 'large', 'enterprise'
);

CREATE TYPE work_location AS ENUM (
  'remote', 'hybrid', 'onsite'
);

CREATE TYPE interaction_type AS ENUM (
  'alumni', 'industry_professional', 'recruiter', 'other'
);

CREATE TYPE interaction_method AS ENUM (
  'linkedin', 'email', 'event', 'call', 'meeting', 'other'
);

-- Drop existing tables if they exist
DROP TABLE IF EXISTS weekly_progress_reviews CASCADE;
DROP TABLE IF EXISTS networking_interactions CASCADE;
DROP TABLE IF EXISTS application_status_history CASCADE;
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS career_goals CASCADE;

-- Create tables
CREATE TABLE career_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  target_roles text[] NOT NULL DEFAULT '{}',
  target_industries text[] NOT NULL DEFAULT '{}',
  preferred_company_size company_size[],
  preferred_location work_location,
  geographic_preferences text[] DEFAULT '{}',
  weekly_application_goal integer DEFAULT 5,
  quality_match_target integer DEFAULT 70,
  campaign_start_date date,
  campaign_end_date date,
  job_boards text[] DEFAULT '{}',
  target_companies text[] DEFAULT '{}',
  weekly_connection_goal integer DEFAULT 5,
  weekly_interview_goal integer DEFAULT 2,
  weekly_event_goal integer DEFAULT 1,
  monthly_alumni_goal integer DEFAULT 3,
  monthly_industry_goal integer DEFAULT 5,
  monthly_recruiter_goal integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  position_title text NOT NULL,
  application_date date NOT NULL,
  source text,
  status application_status NOT NULL DEFAULT 'draft',
  requirements_match integer CHECK (requirements_match BETWEEN 0 AND 100),
  job_description text,
  salary_range jsonb,
  company_size company_size,
  location text,
  work_type work_location,
  application_url text,
  company_url text,
  last_contact_date date,
  next_follow_up date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES job_applications(id) ON DELETE CASCADE,
  status application_status NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE networking_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  company text,
  role text,
  interaction_type interaction_type NOT NULL,
  interaction_date date NOT NULL,
  interaction_method interaction_method NOT NULL,
  discussion_points text,
  follow_up_items text,
  next_steps text,
  next_follow_up_date date,
  linkedin_url text,
  email text,
  phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE weekly_progress_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  applications_submitted integer DEFAULT 0,
  applications_goal integer,
  response_rate numeric CHECK (response_rate BETWEEN 0 AND 100),
  networking_target_met boolean DEFAULT false,
  key_learnings text,
  adjustments_needed text,
  coach_feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE networking_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_progress_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Students can view own career goals"
  ON career_goals FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'mentor')
    )
  );

CREATE POLICY "Students can manage own career goals"
  ON career_goals FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'mentor')
    )
  );

CREATE POLICY "Students can manage own applications"
  ON job_applications FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own application history"
  ON application_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_applications
      WHERE job_applications.id = application_id
      AND (
        job_applications.student_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'coach', 'mentor')
        )
      )
    )
  );

CREATE POLICY "Students can manage own application history"
  ON application_status_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_applications
      WHERE job_applications.id = application_id
      AND job_applications.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_applications
      WHERE job_applications.id = application_id
      AND job_applications.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own networking interactions"
  ON networking_interactions FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'mentor')
    )
  );

CREATE POLICY "Students can manage own networking interactions"
  ON networking_interactions FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own progress reviews"
  ON weekly_progress_reviews FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'mentor')
    )
  );

CREATE POLICY "Students can manage own progress reviews"
  ON weekly_progress_reviews FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Create indexes
CREATE INDEX idx_career_goals_student_id ON career_goals(student_id);
CREATE INDEX idx_job_applications_student_id ON job_applications(student_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_application_history_application_id ON application_status_history(application_id);
CREATE INDEX idx_networking_interactions_student_id ON networking_interactions(student_id);
CREATE INDEX idx_weekly_progress_reviews_student_id ON weekly_progress_reviews(student_id);
CREATE INDEX idx_weekly_progress_reviews_week_start ON weekly_progress_reviews(week_start_date);

-- Create metrics function
CREATE OR REPLACE FUNCTION calculate_application_metrics(student_id uuid, start_date date, end_date date)
RETURNS TABLE (
  total_applications integer,
  applications_by_status jsonb,
  response_rate numeric,
  interview_rate numeric,
  offer_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH metrics AS (
    SELECT
      COUNT(*) as total,
      jsonb_object_agg(status, COUNT(*)) as status_counts,
      COUNT(*) FILTER (WHERE status != 'draft' AND status != 'applied') * 100.0 / NULLIF(COUNT(*), 0) as response_rate,
      COUNT(*) FILTER (WHERE status = 'interview') * 100.0 / NULLIF(COUNT(*), 0) as interview_rate,
      COUNT(*) FILTER (WHERE status = 'offer') * 100.0 / NULLIF(COUNT(*), 0) as offer_rate
    FROM job_applications
    WHERE student_id = calculate_application_metrics.student_id
    AND application_date BETWEEN start_date AND end_date
  )
  SELECT
    total as total_applications,
    status_counts as applications_by_status,
    ROUND(response_rate, 2) as response_rate,
    ROUND(interview_rate, 2) as interview_rate,
    ROUND(offer_rate, 2) as offer_rate
  FROM metrics;
END;
$$;