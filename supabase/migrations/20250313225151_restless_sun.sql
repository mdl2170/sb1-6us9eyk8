-- Drop existing function
DROP FUNCTION IF EXISTS get_student_activity(uuid, date, date);

-- Create new version with correct return types
CREATE OR REPLACE FUNCTION get_student_activity(
  p_coach_id uuid,
  start_date date,
  end_date date
)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  student_email text,
  applications_count bigint,  -- Changed from integer to bigint to match COUNT result
  networking_count bigint,    -- Changed from integer to bigint to match COUNT result
  last_application_date date,
  last_networking_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input parameters
  IF start_date > end_date THEN
    RAISE EXCEPTION 'start_date must be before or equal to end_date';
  END IF;

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