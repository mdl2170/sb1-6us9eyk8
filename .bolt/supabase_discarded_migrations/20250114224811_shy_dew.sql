/*
  # Dashboard Tables and Views

  1. New Tables
    - student_metrics: Track daily student performance metrics
    - risk_assessments: Store student risk evaluations
    - interventions: Track intervention actions for at-risk students

  2. Views
    - student_performance_overview: Aggregated student performance data
    - cohort_analytics: Cohort-level performance metrics

  3. Functions
    - calculate_student_risk_score: Automated risk assessment
*/

-- Student Metrics Table
CREATE TABLE student_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id),
  date date NOT NULL,
  tasks_completed integer DEFAULT 0,
  tasks_total integer DEFAULT 0,
  attendance_hours numeric(5,2) DEFAULT 0,
  engagement_score integer CHECK (engagement_score BETWEEN 0 AND 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (student_id, date)
);

-- Risk Assessment Table
CREATE TABLE risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id),
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_factors jsonb,
  assessment_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Interventions Table
CREATE TABLE interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  type text CHECK (type IN ('academic', 'attendance', 'engagement', 'other')),
  description text,
  status text CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  outcome text,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE student_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_student_metrics_student_date ON student_metrics(student_id, date);
CREATE INDEX idx_risk_assessments_student_level ON risk_assessments(student_id, risk_level);
CREATE INDEX idx_interventions_student_status ON interventions(student_id, status);

-- Create view for student performance overview
CREATE OR REPLACE VIEW student_performance_overview AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  s.cohort,
  COALESCE(
    (SELECT (tasks_completed::float / NULLIF(tasks_total, 0)) * 100
     FROM student_metrics sm
     WHERE sm.student_id = p.id
     ORDER BY date DESC
     LIMIT 1
    ), 0
  ) as completion_rate,
  COALESCE(
    (SELECT engagement_score
     FROM student_metrics sm
     WHERE sm.student_id = p.id
     ORDER BY date DESC
     LIMIT 1
    ), 0
  ) as engagement_score,
  COALESCE(
    (SELECT risk_level
     FROM risk_assessments ra
     WHERE ra.student_id = p.id
     ORDER BY assessment_date DESC
     LIMIT 1
    ), 'low'
  ) as risk_level
FROM profiles p
JOIN students s ON s.id = p.id
WHERE p.role = 'student'
  AND p.status = 'active';

-- Create view for cohort analytics
CREATE OR REPLACE VIEW cohort_analytics AS
WITH cohort_metrics AS (
  SELECT 
    s.cohort,
    COUNT(DISTINCT p.id) as total_students,
    AVG(
      CASE WHEN sm.tasks_total > 0 
      THEN (sm.tasks_completed::float / sm.tasks_total) * 100 
      ELSE 0 
      END
    ) as avg_completion_rate,
    AVG(sm.engagement_score) as avg_engagement_score,
    COUNT(DISTINCT CASE WHEN ra.risk_level = 'high' THEN p.id END) as high_risk_students
  FROM profiles p
  JOIN students s ON s.id = p.id
  LEFT JOIN student_metrics sm ON sm.student_id = p.id
  LEFT JOIN risk_assessments ra ON ra.student_id = p.id
  WHERE p.role = 'student'
    AND p.status = 'active'
  GROUP BY s.cohort
)
SELECT 
  cohort,
  total_students,
  ROUND(avg_completion_rate::numeric, 2) as avg_completion_rate,
  ROUND(avg_engagement_score::numeric, 2) as avg_engagement_score,
  high_risk_students,
  ROUND((high_risk_students::float / NULLIF(total_students, 0) * 100)::numeric, 2) as risk_percentage
FROM cohort_metrics;

-- Create function to calculate student risk score
CREATE OR REPLACE FUNCTION calculate_student_risk_score(student_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  risk_factors jsonb = '{}'::jsonb;
  completion_rate float;
  engagement_score float;
  missed_deadlines int;
  risk_level text;
BEGIN
  -- Get latest metrics
  SELECT 
    COALESCE((tasks_completed::float / NULLIF(tasks_total, 0)) * 100, 0),
    COALESCE(engagement_score, 0)
  INTO completion_rate, engagement_score
  FROM student_metrics
  WHERE student_id = student_uuid
  ORDER BY date DESC
  LIMIT 1;

  -- Count missed deadlines
  SELECT COUNT(*)
  INTO missed_deadlines
  FROM tasks t
  WHERE t.assignee = (
    SELECT email 
    FROM profiles 
    WHERE id = student_uuid
  )
  AND t.due_date < NOW()
  AND t.status != 'completed';

  -- Build risk factors
  risk_factors = jsonb_build_object(
    'completion_rate', completion_rate,
    'engagement_score', engagement_score,
    'missed_deadlines', missed_deadlines
  );

  -- Calculate risk level
  risk_level = CASE
    WHEN completion_rate < 60 OR engagement_score < 50 OR missed_deadlines > 3 THEN 'high'
    WHEN completion_rate < 80 OR engagement_score < 70 OR missed_deadlines > 1 THEN 'medium'
    ELSE 'low'
  END;

  -- Insert new risk assessment
  INSERT INTO risk_assessments (
    student_id,
    risk_level,
    risk_factors
  ) VALUES (
    student_uuid,
    risk_level,
    risk_factors
  );

  RETURN risk_factors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies
CREATE POLICY "Enable read access for admins and coaches"
  ON student_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
      AND status = 'active'
    )
  );

CREATE POLICY "Enable read access for admins and coaches"
  ON risk_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
      AND status = 'active'
    )
  );

CREATE POLICY "Enable read access for admins and coaches"
  ON interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
      AND status = 'active'
    )
  );

CREATE POLICY "Enable insert/update for admins and coaches"
  ON interventions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
      AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach')
      AND status = 'active'
    )
  );

-- Insert sample data
INSERT INTO student_metrics (student_id, date, tasks_completed, tasks_total, attendance_hours, engagement_score)
SELECT 
  p.id,
  CURRENT_DATE - (i || ' days')::interval,
  FLOOR(RANDOM() * 10),
  10,
  ROUND((RANDOM() * 6 + 2)::numeric, 2),
  FLOOR(RANDOM() * 40 + 60)
FROM profiles p
CROSS JOIN generate_series(0, 30) i
WHERE p.role = 'student'
ON CONFLICT (student_id, date) DO NOTHING;

-- Insert sample risk assessments
INSERT INTO risk_assessments (student_id, risk_level, risk_factors, assessment_date)
SELECT 
  p.id,
  CASE 
    WHEN RANDOM() < 0.1 THEN 'high'
    WHEN RANDOM() < 0.3 THEN 'medium'
    ELSE 'low'
  END,
  jsonb_build_object(
    'completion_rate', FLOOR(RANDOM() * 100),
    'engagement_score', FLOOR(RANDOM() * 100),
    'missed_deadlines', FLOOR(RANDOM() * 5)
  ),
  CURRENT_TIMESTAMP - (FLOOR(RANDOM() * 30) || ' days')::interval
FROM profiles p
WHERE p.role = 'student';

-- Insert sample interventions
INSERT INTO interventions (
  student_id,
  created_by,
  type,
  description,
  status,
  due_date
)
SELECT 
  s.id,
  (SELECT id FROM profiles WHERE role = 'coach' LIMIT 1),
  CASE FLOOR(RANDOM() * 4)
    WHEN 0 THEN 'academic'
    WHEN 1 THEN 'attendance'
    WHEN 2 THEN 'engagement'
    ELSE 'other'
  END,
  CASE FLOOR(RANDOM() * 3)
    WHEN 0 THEN 'Schedule additional tutoring sessions'
    WHEN 1 THEN 'Review attendance requirements'
    ELSE 'Discuss engagement strategies'
  END,
  CASE FLOOR(RANDOM() * 4)
    WHEN 0 THEN 'planned'
    WHEN 1 THEN 'in_progress'
    WHEN 2 THEN 'completed'
    ELSE 'cancelled'
  END,
  CURRENT_DATE + (FLOOR(RANDOM() * 14) || ' days')::interval
FROM profiles s
WHERE s.role = 'student'
  AND RANDOM() < 0.3; -- Only create interventions for some students

-- Update student cohorts
UPDATE students
SET cohort = CASE FLOOR(RANDOM() * 3)
  WHEN 0 THEN 'Cohort A'
  WHEN 1 THEN 'Cohort B'
  ELSE 'Cohort C'
END
WHERE cohort IS NULL;