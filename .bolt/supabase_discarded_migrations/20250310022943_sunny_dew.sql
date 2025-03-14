/*
  # Create storage bucket for resumes

  1. Storage Setup
    - Create a new bucket called 'resumes' for storing student resume files
    - Set public access to false for security
    - Configure file size limits and allowed mime types
  
  2. Security
    - Enable RLS policies for secure access
    - Allow students to upload/manage their own resumes
    - Allow staff to view all resumes
*/

-- Create the resumes bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'resumes',
    'resumes',
    false,
    5242880, -- 5MB limit
    ARRAY['application/pdf']::text[]
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the resumes bucket
DO $$
BEGIN
  -- Students can upload their own resumes
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Students can upload own resumes'
  ) THEN
    CREATE POLICY "Students can upload own resumes" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'resumes' AND
        (auth.uid() = (storage.foldername(name))[1]::uuid)
      );
  END IF;

  -- Students can update their own resumes
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Students can update own resumes'
  ) THEN
    CREATE POLICY "Students can update own resumes" ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'resumes' AND
        (auth.uid() = (storage.foldername(name))[1]::uuid)
      );
  END IF;

  -- Students can delete their own resumes
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Students can delete own resumes'
  ) THEN
    CREATE POLICY "Students can delete own resumes" ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'resumes' AND
        (auth.uid() = (storage.foldername(name))[1]::uuid)
      );
  END IF;

  -- Students can view their own resumes, staff can view all
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Resume access control'
  ) THEN
    CREATE POLICY "Resume access control" ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'resumes' AND
        (
          -- Students can view their own resumes
          auth.uid() = (storage.foldername(name))[1]::uuid
          OR
          -- Staff can view all resumes
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'coach', 'mentor')
          )
        )
      );
  END IF;
END $$;