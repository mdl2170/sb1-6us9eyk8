-- Function to delete a networking interaction
CREATE OR REPLACE FUNCTION public.delete_networking_interaction(
  p_interaction_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  interaction_exists boolean;
BEGIN
  -- Verify user has access to delete this interaction
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      id = p_student_id OR  -- User is deleting their own interaction
      role IN ('admin')     -- User is an admin
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Check if interaction exists and belongs to the student
  SELECT EXISTS (
    SELECT 1 
    FROM networking_interactions 
    WHERE id = p_interaction_id 
    AND student_id = p_student_id
  ) INTO interaction_exists;

  IF NOT interaction_exists THEN
    RAISE EXCEPTION 'Networking interaction not found or access denied';
  END IF;

  -- Delete the interaction
  DELETE FROM networking_interactions
  WHERE id = p_interaction_id
  AND student_id = p_student_id;

  RETURN true;
END;
$$;

-- Explicitly revoke all permissions first
REVOKE ALL ON FUNCTION public.delete_networking_interaction(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_networking_interaction(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.delete_networking_interaction(uuid, uuid) FROM anon;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_networking_interaction(uuid, uuid) TO authenticated;