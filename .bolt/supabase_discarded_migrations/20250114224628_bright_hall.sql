/*
  # Sample Data for Dashboard Testing

  1. Sample Data
    - Student metrics
    - Risk assessments
    - Interventions
    - Cohort data

  2. Purpose
    - Provide realistic test data for dashboard development
    - Enable visualization testing
    - Support feature demonstration
*/

-- Insert sample student metrics
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