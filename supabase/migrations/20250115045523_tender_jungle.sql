-- Enable RLS for role-specific tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role has full access to students" ON students;
DROP POLICY IF EXISTS "Service role has full access to coaches" ON coaches;
DROP POLICY IF EXISTS "Service role has full access to mentors" ON mentors;

-- Create policies for service role access
CREATE POLICY "Service role has full access to students"
  ON students
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to coaches"
  ON coaches
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to mentors"
  ON mentors
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policies for authenticated users
CREATE POLICY "Users can view their own student record"
  ON students
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own coach record"
  ON coaches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own mentor record"
  ON mentors
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow admins to view all records
CREATE POLICY "Admins can view all student records"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all coach records"
  ON coaches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all mentor records"
  ON mentors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );