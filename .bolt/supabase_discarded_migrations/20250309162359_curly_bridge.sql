/*
  # Create Office Hours Table

  1. New Tables
    - `office_hours`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references students)
      - `coach_id` (uuid, references profiles)
      - `session_date` (timestamptz)
      - `duration_minutes` (integer)
      - `recording_url` (text)
      - `meeting_notes` (text)
      - `topics_covered` (text[])
      - `action_items` (text[])
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `office_hours` table
    - Add policies for:
      - Students can view own office hours
      - Staff can manage office hours for their students
*/

-- Create office hours table
CREATE TABLE IF NOT EXISTS office_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES profiles(id),
  session_date timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  recording_url text,
  meeting_notes text,
  topics_covered text[],
  action_items text[],
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
    student_id = uid() OR
    coach_id = uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = office_hours.student_id
      AND (s.coach_id = uid() OR s.mentor_id = uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = uid() AND role = 'admin'
    )
  );

CREATE POLICY "Staff can manage office hours"
  ON office_hours
  FOR ALL
  TO authenticated
  USING (
    coach_id = uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = office_hours.student_id
      AND (s.coach_id = uid() OR s.mentor_id = uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    coach_id = uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = office_hours.student_id
      AND (s.coach_id = uid() OR s.mentor_id = uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = uid() AND role = 'admin'
    )
  );