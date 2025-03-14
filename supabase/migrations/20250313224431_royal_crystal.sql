/*
  # Add function to get student activity data
  
  1. New Function
    - get_student_activity: Returns monthly job applications and networking counts
    - Filters by coach ID and date range
    - Groups by student
*/

CREATE OR REPLACE FUNCTION get_student_activity(
  p_coach_id uuid,
  start_date date,
  end_date date
)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  student_email text,
  applications_count integer,
  networking_count integer,
  last_application_date date,
  last_networking_date date
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
      MAX(ni.interaction_date) as last_networking
    FROM students s
    JOIN profiles p ON p.id = s.id
    LEFT JOIN job_applications ja ON ja.student_id = s.id
      AND ja.application_date BETWEEN start_date AND end_date
    LEFT JOIN networking_interactions ni ON ni.student_id = s.id
      AND ni.interaction_date BETWEEN start_date AND end_date
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
    sd.last_networking as last_networking_date
  FROM student_data sd
  ORDER BY sd.full_name;
END;
$$;