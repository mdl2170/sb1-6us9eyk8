-- Drop existing trigger
DROP TRIGGER IF EXISTS on_resume_upload ON storage.objects;

-- Drop trigger function since we're not using it anymore
DROP FUNCTION IF EXISTS handle_resume_upload();

-- Update storage policies to be more permissive for file management
CREATE POLICY "Students can update own resumes"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (auth.uid()::text = split_part(name, '/', 1))
  );

-- Keep get_next_resume_version function as it's still needed
CREATE OR REPLACE FUNCTION get_next_resume_version(student_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM resume_versions
  WHERE student_id = $1;
  
  RETURN next_version;
END;
$$;