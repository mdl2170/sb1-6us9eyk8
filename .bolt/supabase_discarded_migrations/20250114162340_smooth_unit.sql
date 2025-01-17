-- Create stored procedures for user management
CREATE OR REPLACE FUNCTION update_user_role(user_id uuid, new_role text)
RETURNS void AS $$
BEGIN
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
  DELETE FROM profiles WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service role and auth" ON profiles;
DROP POLICY IF EXISTS "Enable update for service role and owners" ON profiles;
DROP POLICY IF EXISTS "Enable delete for service role" ON profiles;

-- Create new policies
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for service role"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Enable update for service role"
  ON profiles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for service role"
  ON profiles FOR DELETE
  TO service_role
  USING (true);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_status TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user TO authenticated;