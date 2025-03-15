/*
  # Create resumes storage bucket

  1. Storage
    - Create a new bucket called 'resumes' for storing student resume files
    - Enable RLS policies for secure access
  
  2. Security
    - Allow students to upload their own resumes
    - Allow staff to view all resumes
    - Prevent unauthorized access
*/

-- Create the resumes bucket
INSERT INTO storage.buckets (id, name)
VALUES ('resumes', 'resumes')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the resumes bucket
CREATE POLICY "Students can upload own resumes" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes' AND
    (auth.uid() = (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Students can update own resumes" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (auth.uid() = (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Students can delete own resumes" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (auth.uid() = (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Students can view own resumes" ON storage.objects
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