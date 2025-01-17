/*
  # Implement Authentication System

  1. Changes
    - Add status check to RLS policies
    - Add auth helper functions
    - Update user management functions to handle status

  2. Security
    - Only active users can access the system
    - Admin users can manage other users
    - Users can only update their own profile
*/

-- Add helper function to check if user is active
CREATE OR REPLACE FUNCTION auth.is_user_active(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helper function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'admin'
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user management functions to check status
CREATE OR REPLACE FUNCTION update_user_role(user_id uuid, new_role text)
RETURNS void AS $$
BEGIN
  -- Check if executing user is admin and active
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only active admin users can update roles';
  END IF;

  UPDATE profiles
  SET 
    role = new_role::user_role,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_user_status(user_id uuid, new_status text)
RETURNS void AS $$
BEGIN
  -- Check if executing user is admin and active
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only active admin users can update status';
  END IF;

  UPDATE profiles
  SET 
    status = new_status,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_user(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if executing user is admin and active
  IF NOT auth.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only active admin users can delete users';
  END IF;

  DELETE FROM profiles WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update policies to check status
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON profiles;
DROP POLICY IF EXISTS "Enable update for service role" ON profiles;
DROP POLICY IF EXISTS "Enable delete for service role" ON profiles;

-- Create new policies with status checks
CREATE POLICY "Active users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.is_user_active(auth.uid()));

CREATE POLICY "Service role can manage profiles"
  ON profiles
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Active users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    AND auth.is_user_active(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id 
    AND auth.is_user_active(auth.uid())
  );

CREATE POLICY "Active admins can manage profiles"
  ON profiles
  TO authenticated
  USING (auth.is_admin(auth.uid()))
  WITH CHECK (auth.is_admin(auth.uid()));