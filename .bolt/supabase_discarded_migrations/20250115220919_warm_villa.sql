/*
  # Enable full access for authenticated users

  1. Changes
    - Drop existing policies
    - Create new policy for authenticated users with full access
    - Keep service role policy for system operations

  2. Security
    - Authenticated users get full access to profiles table
    - Service role retains full access for system operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Service role has full access" ON profiles;
DROP POLICY IF EXISTS "Authenticated users have full access" ON profiles;

-- Create new policies
CREATE POLICY "Service role has full access"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users have full access"
  ON profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);