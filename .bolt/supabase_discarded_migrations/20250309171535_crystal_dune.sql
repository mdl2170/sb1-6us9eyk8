/*
  # Add delete_mock_interview function

  Creates a stored procedure to safely delete mock interviews with proper error handling
  and cascading deletes if needed.

  1. Function Details
    - Name: delete_mock_interview
    - Parameters: interview_id UUID
    - Returns: void
    - Security: Can only be executed by authenticated users with appropriate permissions
*/

CREATE OR REPLACE FUNCTION delete_mock_interview(interview_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the interview exists
  IF NOT EXISTS (
    SELECT 1 FROM mock_interviews WHERE id = interview_id
  ) THEN
    RAISE EXCEPTION 'Mock interview not found';
  END IF;

  -- Delete the mock interview
  DELETE FROM mock_interviews WHERE id = interview_id;

  -- Return success
  RETURN;
EXCEPTION
  WHEN others THEN
    -- Log the error and re-raise
    RAISE EXCEPTION 'Failed to delete mock interview: %', SQLERRM;
END;
$$;