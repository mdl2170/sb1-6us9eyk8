/*
  # Add Initial Users

  1. Changes
    - Insert initial admin, coach, and mentor users if they don't exist
    - Set up their profiles with appropriate roles
  
  2. Security
    - Users are created with email confirmation enabled
    - Passwords are securely hashed
    - Checks for existing users to prevent duplicates
*/

DO $$
DECLARE
  user_exists boolean;
BEGIN
  -- Check if any of the users already exist
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email IN (
      'minh.le@careerpassinstitute.com',
      'tony.duong@careerpassinstitute.com',
      'linh.pham@careerpassinstitute.com',
      'thao.nguyen@careerpassinstitute.com',
      'thanh.nguyen@careerpassinstitute.com'
    )
  ) INTO user_exists;

  -- Only proceed if none of the users exist
  IF NOT user_exists THEN
    -- Insert initial users
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at
    )
    VALUES 
      ('d7bed21c-5a38-4c44-9d0c-f0b6f5b0c8d1', 'minh.le@careerpassinstitute.com', crypt('CPISMS@2025', gen_salt('bf')), now(), now(), now()),
      ('e8bed21c-5a38-4c44-9d0c-f0b6f5b0c8d2', 'tony.duong@careerpassinstitute.com', crypt('CPISMS@2025', gen_salt('bf')), now(), now(), now()),
      ('f9bed21c-5a38-4c44-9d0c-f0b6f5b0c8d3', 'linh.pham@careerpassinstitute.com', crypt('CPISMS@2025', gen_salt('bf')), now(), now(), now()),
      ('a1bed21c-5a38-4c44-9d0c-f0b6f5b0c8d4', 'thao.nguyen@careerpassinstitute.com', crypt('CPISMS@2025', gen_salt('bf')), now(), now(), now()),
      ('b2bed21c-5a38-4c44-9d0c-f0b6f5b0c8d5', 'thanh.nguyen@careerpassinstitute.com', crypt('CPISMS@2025', gen_salt('bf')), now(), now(), now());

    -- Insert corresponding profiles
    INSERT INTO profiles (
      id,
      email,
      full_name,
      role,
      created_at,
      updated_at
    )
    VALUES
      ('d7bed21c-5a38-4c44-9d0c-f0b6f5b0c8d1', 'minh.le@careerpassinstitute.com', 'Minh Le', 'admin', now(), now()),
      ('e8bed21c-5a38-4c44-9d0c-f0b6f5b0c8d2', 'tony.duong@careerpassinstitute.com', 'Tony Duong', 'admin', now(), now()),
      ('f9bed21c-5a38-4c44-9d0c-f0b6f5b0c8d3', 'linh.pham@careerpassinstitute.com', 'Linh Pham', 'admin', now(), now()),
      ('a1bed21c-5a38-4c44-9d0c-f0b6f5b0c8d4', 'thao.nguyen@careerpassinstitute.com', 'Thao Nguyen', 'coach', now(), now()),
      ('b2bed21c-5a38-4c44-9d0c-f0b6f5b0c8d5', 'thanh.nguyen@careerpassinstitute.com', 'Thanh Nguyen', 'mentor', now(), now());
  END IF;
END $$;