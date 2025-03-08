-- Drop existing view
DROP VIEW IF EXISTS student_latest_performance;

-- Create materialized view instead of regular view
CREATE MATERIALIZED VIEW student_latest_performance AS
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

-- Create unique index on student_id
CREATE UNIQUE INDEX idx_student_latest_performance_student_id 
ON student_latest_performance(student_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_student_performance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY student_latest_performance;
  RETURN NULL;
END;
$$;

-- Create triggers to refresh the materialized view
CREATE TRIGGER refresh_student_performance_on_review
  AFTER INSERT OR UPDATE OR DELETE
  ON performance_reviews
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_student_performance();

-- Update the fetchStudentPerformance function to use a simpler join
CREATE OR REPLACE FUNCTION fetch_student_performance(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_data jsonb;
  latest_review jsonb;
  mock_interviews jsonb;
  office_hours jsonb;
  resume_versions jsonb;
BEGIN
  -- Get student profile with performance data
  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'role', p.role,
      'avatar_url', p.avatar_url,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ),
    'student', jsonb_build_object(
      'id', s.id,
      'enrollment_date', s.enrollment_date,
      'status', s.status,
      'attention_level', COALESCE(slp.attention_level, 'level_4'),
      'performance_rating', COALESCE(slp.performance_rating, 'medium'),
      'last_review_date', s.last_review_date,
      'coach', (
        SELECT jsonb_build_object(
          'id', cp.id,
          'full_name', cp.full_name,
          'email', cp.email,
          'role', cp.role,
          'avatar_url', cp.avatar_url
        )
        FROM profiles cp
        WHERE cp.id = s.coach_id
      ),
      'mentor', (
        SELECT jsonb_build_object(
          'id', mp.id,
          'full_name', mp.full_name,
          'email', mp.email,
          'role', mp.role,
          'avatar_url', mp.avatar_url
        )
        FROM profiles mp
        WHERE mp.id = s.mentor_id
      )
    )
  )
  INTO student_data
  FROM profiles p
  JOIN students s ON s.id = p.id
  LEFT JOIN student_latest_performance slp ON slp.student_id = s.id
  WHERE p.id = p_student_id;

  -- Get latest performance review
  SELECT jsonb_build_object(
    'id', pr.id,
    'review_date', pr.review_date,
    'attention_level', pr.attention_level,
    'performance_rating', pr.performance_rating,
    'overall_notes', pr.overall_notes,
    'resume_quality', pr.resume_quality,
    'application_effectiveness', pr.application_effectiveness,
    'behavioral_performance', pr.behavioral_performance,
    'networking_capability', pr.networking_capability,
    'technical_proficiency', pr.technical_proficiency,
    'energy_level', pr.energy_level,
    'indicator_notes', pr.indicator_notes,
    'created_at', pr.created_at,
    'updated_at', pr.updated_at
  )
  INTO latest_review
  FROM performance_reviews pr
  WHERE pr.student_id = p_student_id
  ORDER BY pr.review_date DESC
  LIMIT 1;

  -- Get mock interviews
  SELECT jsonb_agg(row_to_json(mi.*))
  INTO mock_interviews
  FROM mock_interviews mi
  WHERE mi.student_id = p_student_id
  ORDER BY mi.interview_date DESC;

  -- Get office hours
  SELECT jsonb_agg(row_to_json(oh.*))
  INTO office_hours
  FROM office_hours oh
  WHERE oh.student_id = p_student_id
  ORDER BY oh.session_date DESC;

  -- Get resume versions
  SELECT jsonb_agg(row_to_json(rv.*))
  INTO resume_versions
  FROM resume_versions rv
  WHERE rv.student_id = p_student_id
  ORDER BY rv.version_number DESC;

  -- Return combined data
  RETURN jsonb_build_object(
    'profile', student_data->'profile',
    'student', student_data->'student',
    'latest_review', latest_review,
    'mock_interviews', COALESCE(mock_interviews, '[]'::jsonb),
    'office_hours', COALESCE(office_hours, '[]'::jsonb),
    'resume_versions', COALESCE(resume_versions, '[]'::jsonb)
  );
END;
$$;