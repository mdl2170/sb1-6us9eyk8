-- Remove attention_level and performance_rating from students table
ALTER TABLE students
DROP COLUMN attention_level,
DROP COLUMN performance_rating;

-- Create view for latest student performance
CREATE OR REPLACE VIEW student_latest_performance AS
SELECT 
  s.id as student_id,
  s.status,
  s.enrollment_date,
  s.last_review_date,
  pr.attention_level,
  pr.performance_rating,
  pr.resume_quality,
  pr.application_effectiveness,
  pr.behavioral_performance,
  pr.networking_capability,
  pr.technical_proficiency,
  pr.energy_level
FROM students s
LEFT JOIN LATERAL (
  SELECT *
  FROM performance_reviews
  WHERE student_id = s.id
  ORDER BY review_date DESC
  LIMIT 1
) pr ON true;