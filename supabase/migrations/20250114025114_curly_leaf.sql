/*
  # Add last access tracking

  1. Changes
    - Add last_access column to profiles table
    - Update last_access when user signs in
*/

-- Add last_access column to profiles
ALTER TABLE profiles
ADD COLUMN last_access timestamptz;

-- Create function to update last_access
CREATE OR REPLACE FUNCTION handle_auth_user_access()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET last_access = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users
CREATE TRIGGER on_auth_user_access
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_access();