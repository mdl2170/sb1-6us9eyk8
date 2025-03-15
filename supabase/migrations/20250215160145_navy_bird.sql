/*
  # Fix profile and student relationship queries
  
  1. Changes
    - Add explicit join conditions for profile-student relationships
    - Update student performance query function
    - Add helper functions for profile fetching
  
  2. Security
    - Maintain existing RLS policies
    - Add additional checks for data access
*/

-- Function to fetch student performance data
CREATE OR REPLACE FUNCTION get_student_performance(student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_data jsonb;
  profile_data jsonb;
  coach_data jsonb;
  mentor_data jsonb;
  latest_review jsonb;
BEGIN
  -- Get student profile
  SELECT jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'role', p.role,
    'avatar_url', p.avatar_url,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  INTO profile_data
  FROM profiles p
  WHERE p.id = student_id;

  -- Get student details with coach and mentor
  SELECT jsonb_build_object(
    'id', s.id,
    'enrollment_date', s.enrollment_date,
    'status', s.status,
    'attention_level', s.attention_level,
    'performance_rating', s.performance_rating,
    'last_review_date', s.last_review_date,
    'coach', (
      SELECT jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', p.email,
        'role', p.role,
        'avatar_url', p.avatar_url
      )
      FROM profiles p
      WHERE p.id = s.coach_id
    ),
    'mentor', (
      SELECT jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', p.email,
        'role', p.role,
        'avatar_url', p.avatar_url
      )
      FROM profiles p
      WHERE p.id = s.mentor_id
    )
  )
  INTO student_data
  FROM students s
  WHERE s.id = student_id;

  -- Get latest performance review with indicators
  SELECT jsonb_build_object(
    'id', pr.id,
    'review_date', pr.review_date,
    'attention_level', pr.attention_level,
    'performance_rating', pr.performance_rating,
    'overall_notes', pr.overall_notes,
    'created_at', pr.created_at,
    'indicators', (
      SELECT row_to_json(pi.*)
      FROM performance_indicators pi
      WHERE pi.review_id = pr.id
      LIMIT 1
    )
  )
  INTO latest_review
  FROM performance_reviews pr
  WHERE pr.student_id = student_id
  ORDER BY pr.review_date DESC
  LIMIT 1;

  -- Combine all data
  RETURN jsonb_build_object(
    'profile', profile_data,
    'student', student_data,
    'latest_review', latest_review
  );
END;
$$;

-- Update the fetchStudentPerformance RPC function
CREATE OR REPLACE FUNCTION fetch_student_performance(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check permissions
  IF NOT (
    auth.uid() = p_student_id OR -- User is requesting their own data
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = p_student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this student''s performance data';
  END IF;

  RETURN get_student_performance(p_student_id);
END;
$$;