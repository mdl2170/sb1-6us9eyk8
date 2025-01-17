/*
  # Add test profile and student record

  1. New Data
    - Test profile for development
    - Associated student record
    - Coach and mentor assignments
*/

DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
BEGIN
  -- Insert test profile if it doesn't exist
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  )
  VALUES (
    test_user_id,
    'test@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert profile record
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    test_user_id,
    'test@example.com',
    'Test User',
    'student',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert student record
  INSERT INTO students (
    id,
    cohort,
    enrollment_date,
    status,
    coach_id,
    mentor_id,
    target_role,
    job_search_status,
    created_at,
    updated_at
  )
  VALUES (
    test_user_id,
    'Cohort 2024A',
    '2024-01-01',
    'active',
    'd7bed21c-5a38-4c44-9d0c-f0b6f5b0c8d1', -- Minh Le (coach)
    'b2bed21c-5a38-4c44-9d0c-f0b6f5b0c8d5', -- Thanh Nguyen (mentor)
    'Full Stack Developer',
    'preparing',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
END $$;