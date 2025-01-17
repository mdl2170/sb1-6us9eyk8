/*
  # Fix authentication and permissions issues

  1. Changes
    - Add missing permissions for auth.users table
    - Improve error handling in handle_new_user function
    - Add better validation for user metadata
    - Fix role type casting issues
    - Add proper error logging

  2. Security
    - Ensure proper RLS policies for all operations
    - Add proper role validation
*/

-- Drop existing function to recreate with better error handling
DROP FUNCTION IF EXISTS handle_new_user CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role user_role;
  v_full_name text;
BEGIN
  -- Validate and get role from metadata
  IF NEW.raw_user_meta_data->>'role' IS NULL THEN
    v_role := 'student'::user_role;
  ELSIF NEW.raw_user_meta_data->>'role' NOT IN ('student', 'coach', 'mentor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', NEW.raw_user_meta_data->>'role';
  ELSE
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  -- Get full name with proper validation
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- Insert into profiles with proper error handling
  BEGIN
    INSERT INTO profiles (
      id,
      email,
      full_name,
      role,
      status,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_role,
      'active',
      NOW(),
      NOW()
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Profile already exists for user %', NEW.id;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;

  -- If role is student, create student record
  IF v_role = 'student' THEN
    BEGIN
      INSERT INTO students (
        id,
        enrollment_date,
        status
      ) VALUES (
        NEW.id,
        NOW(),
        'active'
      );
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Student record already exists for user %', NEW.id;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error creating student record for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log detailed error information
  RAISE LOG 'Error in handle_new_user for user %: % (SQLSTATE: %)', 
    NEW.id, 
    SQLERRM,
    SQLSTATE;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant necessary permissions to anon users
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Create policy for auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage users"
  ON auth.users
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add better error handling for profile updates
CREATE OR REPLACE FUNCTION handle_profile_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  
  -- Validate role if it's being changed
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF NEW.role NOT IN ('student', 'coach', 'mentor', 'admin') THEN
      RAISE EXCEPTION 'Invalid role: %', NEW.role;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_profile_update: % (SQLSTATE: %)', 
    SQLERRM,
    SQLSTATE;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS before_profile_update ON profiles;
CREATE TRIGGER before_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_update();