-- Add weekly review tracking to students table if columns don't exist
DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'students' AND column_name = 'weekly_review_day') THEN
        ALTER TABLE students
        ADD COLUMN weekly_review_day smallint CHECK (weekly_review_day BETWEEN 0 AND 6);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'students' AND column_name = 'alert_threshold_applications') THEN
        ALTER TABLE students
        ADD COLUMN alert_threshold_applications integer DEFAULT 5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'students' AND column_name = 'alert_threshold_networking') THEN
        ALTER TABLE students
        ADD COLUMN alert_threshold_networking integer DEFAULT 3;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'students' AND column_name = 'alert_threshold_interviews') THEN
        ALTER TABLE students
        ADD COLUMN alert_threshold_interviews integer DEFAULT 2;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'students' AND column_name = 'target_companies_count') THEN
        ALTER TABLE students
        ADD COLUMN target_companies_count integer DEFAULT 10;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'students' AND column_name = 'weekly_application_goal') THEN
        ALTER TABLE students
        ADD COLUMN weekly_application_goal integer DEFAULT 5;
    END IF;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_alerts_student') THEN
        CREATE INDEX idx_alerts_student ON performance_alerts(student_id, created_at);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_alerts_type') THEN
        CREATE INDEX idx_alerts_type ON performance_alerts(alert_type, severity);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_alerts_status') THEN
        CREATE INDEX idx_alerts_status ON performance_alerts(resolved_at NULLS FIRST);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_metrics_student') THEN
        CREATE INDEX idx_metrics_student ON performance_metrics(student_id, metric_date);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_metrics_type') THEN
        CREATE INDEX idx_metrics_type ON performance_metrics(metric_type);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goals_student') THEN
        CREATE INDEX idx_goals_student ON performance_goals(student_id, status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goals_dates') THEN
        CREATE INDEX idx_goals_dates ON performance_goals(start_date, target_date);
    END IF;
END $$;

-- Create or replace the alert generation function
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