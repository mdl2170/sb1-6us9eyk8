/*
  # Fix RLS policies for service role access

  1. Changes
    - Drop existing policies
    - Create new policy for service role with unrestricted access
    - Recreate policies for authenticated users
    - Fix policy syntax to properly handle service role operations

  2. Security
    - Service role gets full access without restrictions
    - Authenticated users can read all profiles
    - Users can only update their own profiles (or admins can update any)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable full access for service role" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users and admins" ON profiles;

-- Create new policies with proper service role access
CREATE POLICY "Service role has full access"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile or admin can update any"
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