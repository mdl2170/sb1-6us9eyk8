/*
  # Add last_sign_in field to profiles table

  1. Changes
    - Add last_sign_in field to profiles table
    - Create trigger to update last_sign_in when auth.users.last_sign_in_at changes
*/

-- Add last_sign_in field to profiles table
ALTER TABLE profiles
ADD COLUMN last_sign_in timestamptz;

-- Create function to update last_sign_in
CREATE OR REPLACE FUNCTION handle_auth_user_signin()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET last_sign_in = NEW.last_sign_in_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_signin ON auth.users;
CREATE TRIGGER on_auth_user_signin
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_signin();