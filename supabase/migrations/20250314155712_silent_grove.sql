/*
  # Update get_student_activity function
  
  1. Changes
    - Drop existing function first
    - Recreate function with new return type including activity dates
    - Add proper date filtering for all activities
*/

-- Drop existing function first
DROP FUNCTION IF EXISTS get_student_activity(uuid, date, date);

-- Create new version with additional return columns
CREATE OR REPLACE FUNCTION get_student_activity(
  p_coach_id uuid,
  start_date date,
  end_date date
)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  student_email text,
  applications_count bigint,
  networking_count bigint,
  last_application_date date,
  last_networking_date date,
  last_office_hour date,
  last_mock_interview date,
  last_resume_review date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH student_data AS (
    SELECT 
      s.id,
      p.full_name,
      p.email,
      COUNT(DISTINCT ja.id) as applications,
      COUNT(DISTINCT ni.id) as networking,
      MAX(ja.application_date) as last_application,
      MAX(ni.interaction_date) as last_networking,
      MAX(oh.session_date)::date as last_office_hour,
      MAX(mi.interview_date)::date as last_mock_interview,
      MAX(rv.created_at)::date as last_resume_review
    FROM students s
    JOIN profiles p ON p.id = s.id
    LEFT JOIN job_applications ja ON ja.student_id = s.id
      AND ja.application_date BETWEEN start_date AND end_date
    LEFT JOIN networking_interactions ni ON ni.student_id = s.id
      AND ni.interaction_date BETWEEN start_date AND end_date
    LEFT JOIN office_hours oh ON oh.student_id = s.id
      AND oh.session_date BETWEEN start_date AND end_date
    LEFT JOIN mock_interviews mi ON mi.student_id = s.id
      AND mi.interview_date BETWEEN start_date AND end_date
    LEFT JOIN resume_versions rv ON rv.student_id = s.id
      AND rv.created_at BETWEEN start_date AND end_date
    WHERE s.coach_id = p_coach_id
      AND s.status = 'active'
    GROUP BY s.id, p.full_name, p.email
  )
  SELECT
    sd.id as student_id,
    sd.full_name as student_name,
    sd.email as student_email,
    sd.applications as applications_count,
    sd.networking as networking_count,
    sd.last_application as last_application_date,
    sd.last_networking as last_networking_date,
    sd.last_office_hour,
    sd.last_mock_interview,
    sd.last_resume_review
  FROM student_data sd
  ORDER BY sd.full_name;
END;
$$;