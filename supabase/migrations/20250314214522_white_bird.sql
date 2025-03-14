/*
  # Fix resume version policies
  
  1. Changes
    - Drop and recreate policies for resume_versions table
    - Add delete policy for students
    - Update staff review policy
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Students can view own resume uploads" ON resume_versions;
DROP POLICY IF EXISTS "Students can upload own resumes" ON resume_versions;
DROP POLICY IF EXISTS "Staff can review resumes" ON resume_versions;
DROP POLICY IF EXISTS "Students can view own resume versions" ON resume_versions;
DROP POLICY IF EXISTS "Students can manage own resume versions" ON resume_versions;
DROP POLICY IF EXISTS "Staff can review resume versions" ON resume_versions;

-- Create new policies
CREATE POLICY "Students can read own resumes"
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

CREATE POLICY "Students can insert own resumes"
  ON resume_versions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can delete own resumes"
  ON resume_versions FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Staff can review resumes"
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