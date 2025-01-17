/*
  # Fix sign-in triggers

  1. Changes
    - Drop redundant last_sign_in trigger and function
    - Improve error handling for last_access trigger
    - Add index for last_access column
*/

-- Drop redundant trigger and function
DROP TRIGGER IF EXISTS on_auth_user_signin ON auth.users;
DROP FUNCTION IF EXISTS handle_auth_user_signin;

-- Drop redundant column
ALTER TABLE profiles
DROP COLUMN IF EXISTS last_sign_in;

-- Improve error handling for last_access trigger
CREATE OR REPLACE FUNCTION handle_auth_user_access()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET 
    last_access = now(),
    updated_at = now()
  WHERE id = NEW.id;
  
  -- Return NULL if profile doesn't exist yet (will be created by handle_new_user)
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE LOG 'Error in handle_auth_user_access for user %: % (SQLSTATE: %)', 
    NEW.id, 
    SQLERRM,
    SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for last_access
CREATE INDEX IF NOT EXISTS idx_profiles_last_access ON profiles(last_access);