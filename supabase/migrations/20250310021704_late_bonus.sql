/*
  # Add resume version trigger and functions

  1. New Functions
    - Create function to get next resume version number
    - Create function to handle resume uploads
  
  2. Triggers
    - Add trigger to automatically create resume version records
    - Handle version numbering and metadata
*/

-- Function to get next version number for a student
CREATE OR REPLACE FUNCTION get_next_resume_version(student_id uuid)
RETURNS integer AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM resume_versions
  WHERE student_id = $1;
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle resume uploads
CREATE OR REPLACE FUNCTION handle_resume_upload()
RETURNS trigger AS $$
BEGIN
  -- Only handle resumes bucket
  IF NEW.bucket_id = 'resumes' THEN
    -- Extract student ID from path (first segment)
    DECLARE
      path_parts text[];
      student_id uuid;
      version_number integer;
    BEGIN
      path_parts := string_to_array(storage.foldername(NEW.name), '/');
      student_id := path_parts[1]::uuid;
      
      -- Get next version number
      version_number := get_next_resume_version(student_id);
      
      -- Create resume version record
      INSERT INTO resume_versions (
        student_id,
        version_number,
        file_url,
        status,
        created_at,
        updated_at
      ) VALUES (
        student_id,
        version_number,
        storage.download_url(NEW.bucket_id, NEW.name),
        'draft',
        NOW(),
        NOW()
      );
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on storage.objects
DROP TRIGGER IF EXISTS on_resume_upload ON storage.objects;
CREATE TRIGGER on_resume_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION handle_resume_upload();