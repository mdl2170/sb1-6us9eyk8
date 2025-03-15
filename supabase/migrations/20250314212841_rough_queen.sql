-- Drop existing function
DROP FUNCTION IF EXISTS get_next_resume_version(uuid);

-- Create new version with unambiguous parameter name
CREATE OR REPLACE FUNCTION get_next_resume_version(
  p_student_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM resume_versions rv
  WHERE rv.student_id = p_student_id;
  
  RETURN next_version;
END;
$$;