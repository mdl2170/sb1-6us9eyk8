/*
  # Fix resume version function parameter name
  
  1. Changes
    - Add overloaded version of get_next_resume_version function
    - Keep existing function for backward compatibility
    - Both functions share the same implementation
*/

-- Create overloaded version that accepts student_id parameter
CREATE OR REPLACE FUNCTION get_next_resume_version(
  student_id uuid
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
  WHERE rv.student_id = student_id;
  
  RETURN next_version;
END;
$$;