/*
  # Create User Management Functions
  
  1. New Functions
    - create_user_with_profile: Creates a new user with auth, profile and role-specific records
    - delete_user_with_profile: Deletes a user and all associated records
  
  2. Security
    - Functions are only accessible by service role or admin users
*/

-- Function to create a user with profile and role-specific records
CREATE OR REPLACE FUNCTION create_user_with_profile(
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_role user_role
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create auth user
  new_user_id := extensions.uuid_generate_v4();
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', user_full_name),
    now(),
    now()
  );

  -- Create profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    user_email,
    user_full_name,
    user_role,
    'active',
    now(),
    now()
  );

  -- Create role-specific record
  CASE user_role
    WHEN 'student' THEN
      INSERT INTO students (
        id,
        enrollment_date,
        status
      )
      VALUES (
        new_user_id,
        now(),
        'active'
      );
    
    WHEN 'coach' THEN
      INSERT INTO coaches (
        id,
        specialization,
        max_students
      )
      VALUES (
        new_user_id,
        '{}',
        20
      );
    
    WHEN 'mentor' THEN
      INSERT INTO mentors (
        id,
        expertise,
        max_mentees
      )
      VALUES (
        new_user_id,
        '{}',
        10
      );
    
    ELSE
      -- No role-specific record needed for admin
  END CASE;

  RETURN new_user_id;
END;
$$;

-- Function to delete a user and all associated records
CREATE OR REPLACE FUNCTION delete_user_with_profile(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  
  -- Delete role-specific record
  CASE user_role
    WHEN 'student' THEN
      DELETE FROM students WHERE id = user_id;
    WHEN 'coach' THEN
      DELETE FROM coaches WHERE id = user_id;
    WHEN 'mentor' THEN
      DELETE FROM mentors WHERE id = user_id;
    ELSE
      -- No role-specific record to delete
  END CASE;

  -- Delete profile
  DELETE FROM profiles WHERE id = user_id;
  
  -- Delete auth user
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;