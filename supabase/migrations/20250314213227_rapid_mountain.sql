/*
  # Create resumes storage bucket and policies
  
  1. Changes
    - Create resumes bucket if not exists
    - Set up proper storage policies for resume access
    - Enable public access for viewing resumes
*/

-- Create the resumes bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can upload own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Students can update own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Students can view own resumes and staff can view all" ON storage.objects;

-- Create comprehensive policies for resume storage
CREATE POLICY "Anyone can read resumes"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'resumes');

CREATE POLICY "Students can upload own resumes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes' AND
    (auth.uid()::text = split_part(name, '/', 1))
  );

CREATE POLICY "Students can update own resumes"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (auth.uid()::text = split_part(name, '/', 1))
  );

CREATE POLICY "Students can delete own resumes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (auth.uid()::text = split_part(name, '/', 1))
  );