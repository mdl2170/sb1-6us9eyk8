/*
  # Fix profiles RLS policies

  1. Changes
    - Add policy to allow service role to bypass RLS for profiles table
    - Ensure service role has full access to all operations

  2. Security
    - Service role can perform all operations
    - Maintains existing policies for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON profiles;
DROP POLICY IF EXISTS "Enable update for service role" ON profiles;
DROP POLICY IF EXISTS "Enable delete for service role" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new comprehensive policies
CREATE POLICY "Enable full access for service role"
  ON profiles
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update for users and admins"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );