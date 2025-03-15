-- Add weekly review tracking to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS weekly_review_day smallint CHECK (weekly_review_day BETWEEN 0 AND 6),
ADD COLUMN IF NOT EXISTS alert_threshold_applications integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS alert_threshold_networking integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS alert_threshold_interviews integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS target_companies_count integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS weekly_application_goal integer DEFAULT 5;

-- Performance Alerts table
CREATE TABLE performance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (
    alert_type IN (
      'low_applications',
      'low_networking',
      'low_interviews',
      'missed_review',
      'performance_drop',
      'technical_gap',
      'behavioral_concern'
    )
  ),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message text NOT NULL,
  metrics jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Performance Metrics table
CREATE TABLE performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  metric_type text NOT NULL CHECK (
    metric_type IN (
      'application_rate',
      'response_rate',
      'interview_rate',
      'networking_effectiveness',
      'technical_readiness',
      'behavioral_readiness'
    )
  ),
  metric_value numeric NOT NULL,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Performance Goals table
CREATE TABLE performance_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (
    goal_type IN (
      'applications',
      'networking',
      'interviews',
      'technical_skills',
      'behavioral_skills'
    )
  ),
  target_value numeric NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  target_date date NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (
    status IN ('in_progress', 'completed', 'missed')
  ),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for performance_alerts
CREATE POLICY "Users can view relevant alerts"
  ON performance_alerts FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = performance_alerts.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Staff can create alerts"
  ON performance_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'mentor')
    )
  );

-- Create policies for performance_metrics
CREATE POLICY "Users can view relevant metrics"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = performance_metrics.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create policies for performance_goals
CREATE POLICY "Users can view relevant goals"
  ON performance_goals FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = performance_goals.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Students and staff can create goals"
  ON performance_goals FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_alerts_student ON performance_alerts(student_id, created_at);
CREATE INDEX idx_alerts_type ON performance_alerts(alert_type, severity);
CREATE INDEX idx_alerts_status ON performance_alerts(resolved_at NULLS FIRST);
CREATE INDEX idx_metrics_student ON performance_metrics(student_id, metric_date);
CREATE INDEX idx_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_goals_student ON performance_goals(student_id, status);
CREATE INDEX idx_goals_dates ON performance_goals(start_date, target_date);

-- Function to generate performance alerts
CREATE OR REPLACE FUNCTION generate_performance_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_record record;
  weekly_metrics jsonb;
  alert_type text;
  alert_message text;
  alert_severity text;
BEGIN
  FOR student_record IN
    SELECT s.*, p.full_name
    FROM students s
    JOIN profiles p ON p.id = s.id
    WHERE s.status = 'active'
  LOOP
    -- Check applications
    IF student_record.alert_threshold_applications > 0 THEN
      SELECT COUNT(*)::int < student_record.alert_threshold_applications,
             COUNT(*)::int
      INTO alert_severity, weekly_metrics
      FROM job_applications
      WHERE student_id = student_record.id
      AND application_date >= date_trunc('week', CURRENT_DATE);

      IF alert_severity THEN
        alert_type := 'low_applications';
        alert_message := format(
          'Student %s has submitted only %s applications this week (target: %s)',
          student_record.full_name,
          weekly_metrics,
          student_record.alert_threshold_applications
        );

        INSERT INTO performance_alerts (
          student_id,
          alert_type,
          severity,
          message,
          metrics
        ) VALUES (
          student_record.id,
          alert_type,
          CASE
            WHEN weekly_metrics = 0 THEN 'high'
            WHEN weekly_metrics < student_record.alert_threshold_applications / 2 THEN 'medium'
            ELSE 'low'
          END,
          alert_message,
          jsonb_build_object('weekly_applications', weekly_metrics)
        );
      END IF;
    END IF;

    -- Add similar checks for networking and interviews
    -- (Additional alert generation logic can be added here)
  END LOOP;
END;
$$;