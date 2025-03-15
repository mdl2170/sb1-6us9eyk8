/*
  # Remove unused tables
  
  1. Changes
    - Drop unused tables and their dependencies
    - Remove related indexes and constraints
    - Clean up any associated types
*/

-- Drop tables in correct order to handle dependencies
DROP TABLE IF EXISTS interventions CASCADE;
DROP TABLE IF EXISTS performance_alerts CASCADE;
DROP TABLE IF EXISTS performance_goals CASCADE;
DROP TABLE IF EXISTS resume_versions CASCADE;
DROP TABLE IF EXISTS risk_assessments CASCADE;
DROP TABLE IF EXISTS student_metrics CASCADE;

-- Drop any associated indexes that might have been created separately
DROP INDEX IF EXISTS idx_alerts_student;
DROP INDEX IF EXISTS idx_alerts_type;
DROP INDEX IF EXISTS idx_alerts_status;
DROP INDEX IF EXISTS idx_metrics_student;
DROP INDEX IF EXISTS idx_metrics_type;
DROP INDEX IF EXISTS idx_goals_student;
DROP INDEX IF EXISTS idx_goals_dates;
DROP INDEX IF EXISTS idx_student_metrics_student_date;
DROP INDEX IF EXISTS idx_student_metrics_student_id;
DROP INDEX IF EXISTS idx_risk_assessments_student_level;
DROP INDEX IF EXISTS idx_resume_versions_student_id;