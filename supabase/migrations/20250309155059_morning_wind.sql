/*
  # Fix RLS policies for mock interviews table

  1. Security
    - Drop existing policies
    - Enable RLS on mock_interviews table
    - Add policies for:
      - Students can view their own mock interviews
      - Staff (coaches, mentors, admins) can view mock interviews for their students
      - Staff can create mock interviews
      - Staff can update mock interviews they created
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view own mock interviews" ON mock_interviews;
DROP POLICY IF EXISTS "Staff can create mock interviews" ON mock_interviews;
DROP POLICY IF EXISTS "Staff can update mock interviews" ON mock_interviews;

-- Enable RLS
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;

-- Students can view their own mock interviews
CREATE POLICY "Students can view own mock interviews"
ON mock_interviews
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid() OR
  interviewer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = mock_interviews.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Staff can create mock interviews
CREATE POLICY "Staff can create mock interviews"
ON mock_interviews
FOR INSERT
TO authenticated
WITH CHECK (
  interviewer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = mock_interviews.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Staff can update mock interviews they created
CREATE POLICY "Staff can update mock interviews"
ON mock_interviews
FOR UPDATE
TO authenticated
USING (
  interviewer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = mock_interviews.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  interviewer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = mock_interviews.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);