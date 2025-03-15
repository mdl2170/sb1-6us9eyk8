/*
  # Add Resume Upload Button

  1. New Tables
    - `resume_uploads`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key to students)
      - `file_url` (text)
      - `version` (integer)
      - `status` (text)
      - `feedback` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `resume_uploads` table
    - Add policies for students to manage their own uploads
    - Add policies for staff to review uploads
*/

-- Create resume uploads table
CREATE TABLE IF NOT EXISTS resume_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE resume_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Students can view own resume uploads"
  ON resume_uploads
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coach', 'mentor')
    )
  );

CREATE POLICY "Students can upload own resumes"
  ON resume_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Staff can review resumes"
  ON resume_uploads
  FOR UPDATE
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

-- Create indexes
CREATE INDEX idx_resume_uploads_student_id ON resume_uploads(student_id);
CREATE INDEX idx_resume_uploads_status ON resume_uploads(status);