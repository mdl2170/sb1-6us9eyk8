-- Add weekly review tracking to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS weekly_review_day smallint CHECK (weekly_review_day BETWEEN 0 AND 6),
ADD COLUMN IF NOT EXISTS alert_threshold_applications integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS alert_threshold_networking integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS alert_threshold_interviews integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS target_companies_count integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS weekly_application_goal integer DEFAULT 5;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_alerts_student ON performance_alerts(student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON performance_alerts(alert_type, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON performance_alerts(resolved_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_metrics_student ON performance_metrics(student_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_goals_student ON performance_goals(student_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_dates ON performance_goals(start_date, target_date);

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