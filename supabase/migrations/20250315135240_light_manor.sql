/*
  # Add resume review functionality
  
  1. Changes
    - Add reviewed_by and reviewed_at columns to resume_versions
    - Update RLS policies for review functionality
    - Add function to handle review updates
*/

-- Add review columns to resume_versions
ALTER TABLE resume_versions
ADD COLUMN reviewed_by uuid REFERENCES profiles(id),
ADD COLUMN reviewed_at timestamptz;

-- Create function to handle resume review
CREATE OR REPLACE FUNCTION review_resume_version(
  version_id uuid,
  new_status text,
  feedback_text text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate status
  IF new_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be pending, approved, or rejected';
  END IF;

  -- Update resume version
  UPDATE resume_versions
  SET 
    status = new_status,
    feedback = feedback_text,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = version_id;
END;
$$;