-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant performance reviews" ON performance_reviews;
DROP POLICY IF EXISTS "Users can update their own performance reviews" ON performance_reviews;
DROP POLICY IF EXISTS "Staff can create performance reviews" ON performance_reviews;

-- Create comprehensive policies for performance reviews
CREATE POLICY "Users can view relevant performance reviews"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    coach_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = performance_reviews.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Staff can create performance reviews"
  ON performance_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_id
      AND (s.coach_id = auth.uid() OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
      ))
    )
  );

CREATE POLICY "Staff can update performance reviews"
  ON performance_reviews FOR UPDATE
  TO authenticated
  USING (
    coach_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    coach_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );