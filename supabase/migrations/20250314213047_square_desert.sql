/*
  # Fix resume version function parameter name
  
  1. Changes
    - Drop existing function first
    - Create new version with student_id parameter
    - Maintain security and search path settings
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_next_resume_version(uuid);

-- Create new version with student_id parameter
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
  -- Use table alias and explicit parameter reference
  SELECT COALESCE(MAX(rv.version_number), 0) + 1
  INTO next_version
  FROM resume_versions rv
  WHERE rv.student_id = get_next_resume_version.student_id;
  
  RETURN next_version;
END;
$$;