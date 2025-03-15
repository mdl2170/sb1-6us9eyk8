/*
  # Add coach access policies for performance review

  1. Changes
    - Add RLS policies to allow coaches to:
      - View and manage performance reviews for their students
      - View and manage mock interviews for their students
      - View and manage office hours records for their students
      - View and manage resume versions for their students
    
  2. Security
    - Coaches can only access data for students they are assigned to
    - Maintains existing student and admin access policies
*/

-- Performance Reviews
CREATE POLICY "Coaches can manage their students' performance reviews"
ON performance_reviews
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = performance_reviews.student_id
    AND s.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = performance_reviews.student_id
    AND s.coach_id = auth.uid()
  )
);

-- Mock Interviews
CREATE POLICY "Coaches can manage their students' mock interviews"
ON mock_interviews
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = mock_interviews.student_id
    AND s.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = mock_interviews.student_id
    AND s.coach_id = auth.uid()
  )
);

-- Office Hours
CREATE POLICY "Coaches can manage their students' office hours"
ON office_hours
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = office_hours.student_id
    AND s.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = office_hours.student_id
    AND s.coach_id = auth.uid()
  )
);

-- Resume Versions
CREATE POLICY "Coaches can manage their students' resume versions"
ON resume_versions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = resume_versions.student_id
    AND s.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = resume_versions.student_id
    AND s.coach_id = auth.uid()
  )
);