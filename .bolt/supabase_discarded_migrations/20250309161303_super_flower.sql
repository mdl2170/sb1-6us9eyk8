/*
  # Update RLS policies for mock interviews and office hours

  1. Changes
    - Update mock_interviews policies to allow proper access
    - Update office_hours policies to allow proper access
    
  2. Security
    - Students can view their own records
    - Staff (coaches, mentors, admins) can view records of their assigned students
    - Staff can create records for their assigned students
*/

-- Drop existing policies for mock_interviews
DROP POLICY IF EXISTS "Students can view own mock interviews" ON mock_interviews;
DROP POLICY IF EXISTS "Staff can create mock interviews" ON mock_interviews;
DROP POLICY IF EXISTS "Staff can update mock interviews" ON mock_interviews;

-- Create new policies for mock_interviews
CREATE POLICY "Users can view relevant mock interviews"
ON mock_interviews
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid() OR  -- Student can view own interviews
  interviewer_id = auth.uid() OR  -- Interviewer can view interviews they conducted
  EXISTS (  -- Staff can view interviews of their assigned students
    FROM students s
    WHERE s.id = mock_interviews.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (  -- Admins can view all interviews
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Staff can create mock interviews"
ON mock_interviews
FOR INSERT
TO authenticated
WITH CHECK (
  interviewer_id = auth.uid() OR  -- User is the interviewer
  EXISTS (  -- User is the student's coach/mentor
    FROM students s
    WHERE s.id = mock_interviews.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (  -- User is an admin
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Staff can update mock interviews"
ON mock_interviews
FOR UPDATE
TO authenticated
USING (
  interviewer_id = auth.uid() OR  -- Interviewer can update
  EXISTS (  -- Coach/mentor can update
    FROM students s
    WHERE s.id = mock_interviews.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (  -- Admin can update
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  interviewer_id = auth.uid() OR
  EXISTS (
    FROM students s
    WHERE s.id = mock_interviews.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Drop existing policies for office_hours
DROP POLICY IF EXISTS "Students can view own office hours" ON office_hours;

-- Create new policies for office_hours
CREATE POLICY "Users can view relevant office hours"
ON office_hours
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid() OR  -- Student can view own office hours
  coach_id = auth.uid() OR    -- Coach can view office hours they conducted
  EXISTS (  -- Staff can view office hours of their assigned students
    FROM students s
    WHERE s.id = office_hours.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (  -- Admins can view all office hours
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Staff can create office hours"
ON office_hours
FOR INSERT
TO authenticated
WITH CHECK (
  coach_id = auth.uid() OR  -- User is the coach
  EXISTS (  -- User is the student's coach/mentor
    FROM students s
    WHERE s.id = office_hours.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (  -- User is an admin
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Staff can update office hours"
ON office_hours
FOR UPDATE
TO authenticated
USING (
  coach_id = auth.uid() OR  -- Coach can update
  EXISTS (  -- Coach/mentor can update
    FROM students s
    WHERE s.id = office_hours.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (  -- Admin can update
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  coach_id = auth.uid() OR
  EXISTS (
    FROM students s
    WHERE s.id = office_hours.student_id
    AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
  ) OR
  EXISTS (
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);