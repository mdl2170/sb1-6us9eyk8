-- Function to delete a job application
CREATE OR REPLACE FUNCTION delete_job_application(
  p_application_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  application_exists boolean;
BEGIN
  -- Verify user has access to delete this application
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      id = p_student_id OR  -- User is deleting their own application
      role IN ('admin')     -- User is an admin
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Check if application exists and belongs to the student
  SELECT EXISTS (
    SELECT 1 
    FROM job_applications 
    WHERE id = p_application_id 
    AND student_id = p_student_id
  ) INTO application_exists;

  IF NOT application_exists THEN
    RAISE EXCEPTION 'Application not found or access denied';
  END IF;

  -- Delete application status history first (cascade will handle this, but being explicit)
  DELETE FROM application_status_history
  WHERE application_id = p_application_id;

  -- Delete the application
  DELETE FROM job_applications
  WHERE id = p_application_id
  AND student_id = p_student_id;

  RETURN true;
END;
$$;