/*
  # Add User Status Management Functions
  
  1. New Functions
    - update_user_status: Updates a user's status in the profiles table
    - update_user_role: Updates a user's role in the profiles table
  
  2. Security
    - Functions are restricted to authenticated users
    - Role updates require admin role
    - Status updates require admin role
*/

-- Function to update user status
CREATE OR REPLACE FUNCTION update_user_status(
  user_id uuid,
  new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can update user status';
  END IF;

  -- Validate status value
  IF new_status NOT IN ('active', 'inactive', 'suspended', 'archived') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;

  -- Update the user's status
  UPDATE profiles 
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = user_id;

  -- If user is a student, update student status
  IF EXISTS (
    SELECT 1 FROM students WHERE id = user_id
  ) THEN
    UPDATE students
    SET status = CASE 
      WHEN new_status = 'active' THEN 'active'
      WHEN new_status = 'archived' THEN 'graduated'
      ELSE 'inactive'
    END
    WHERE id = user_id;
  END IF;
END;
$$;

-- Function to update user role
CREATE OR REPLACE FUNCTION update_user_role(
  user_id uuid,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can update user roles';
  END IF;

  -- Validate role value
  IF new_role NOT IN ('student', 'coach', 'mentor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role value';
  END IF;

  -- Update the user's role
  UPDATE profiles 
  SET 
    role = new_role::user_role,
    updated_at = now()
  WHERE id = user_id;
END;
$$;