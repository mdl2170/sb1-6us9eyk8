/*
  # Fix resume deletion policies
  
  1. Changes
    - Add delete policy for resume_versions table
    - Update existing policies to be more specific
    - Ensure students can delete their own resume versions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view own resume uploads" ON resume_versions;
DROP POLICY IF EXISTS "Students can upload own resumes" ON resume_versions;
DROP POLICY IF EXISTS "Staff can review resumes" ON resume_versions;

-- Create comprehensive policies for resume versions
CREATE POLICY "Students can view own resume versions"
  ON resume_versions FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach', 'mentor')
    )
  );

CREATE POLICY "Students can manage own resume versions"
  ON resume_versions FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Staff can review resume versions"
  ON resume_versions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach', 'mentor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach', 'mentor')
    )
  );