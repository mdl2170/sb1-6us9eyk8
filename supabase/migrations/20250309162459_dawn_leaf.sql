/*
  # Fix Office Hours Table

  1. Changes
    - Drop existing office hours table if exists
    - Recreate office hours table with proper UUID handling
    - Add proper indexes and foreign key constraints
    - Set up RLS policies

  2. Security
    - Enable RLS
    - Add policies for viewing and managing office hours
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS office_hours;

-- Create office hours table with proper UUID handling
CREATE TABLE office_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES profiles(id),
  session_date timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  recording_url text,
  meeting_notes text,
  topics_covered text[] DEFAULT '{}',
  action_items text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE office_hours ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_office_hours_student_id ON office_hours(student_id);
CREATE INDEX IF NOT EXISTS idx_office_hours_coach_id ON office_hours(coach_id);

-- Create policies
CREATE POLICY "Students can view own office hours"
  ON office_hours
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    coach_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = office_hours.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Staff can manage office hours"
  ON office_hours
  FOR ALL
  TO authenticated
  USING (
    coach_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = office_hours.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    coach_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = office_hours.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );