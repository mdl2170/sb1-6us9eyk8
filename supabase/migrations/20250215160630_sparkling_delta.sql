/*
  # Fix performance data queries
  
  1. Changes
    - Add explicit join conditions for profile-student relationships
    - Update student performance query function
    - Add helper functions for profile fetching
  
  2. Security
    - Maintain existing RLS policies
    - Add additional checks for data access
*/

-- Function to fetch student performance data with explicit joins
CREATE OR REPLACE FUNCTION get_student_performance(student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_data jsonb;
  profile_data jsonb;
  latest_review jsonb;
  mock_interviews jsonb;
  office_hours jsonb;
  resume_versions jsonb;
BEGIN
  -- Get student profile with student details
  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'role', p.role,
      'avatar_url', p.avatar_url,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ),
    'student', jsonb_build_object(
      'id', s.id,
      'enrollment_date', s.enrollment_date,
      'status', s.status,
      'attention_level', s.attention_level,
      'performance_rating', s.performance_rating,
      'last_review_date', s.last_review_date,
      'coach', (
        SELECT jsonb_build_object(
          'id', cp.id,
          'full_name', cp.full_name,
          'email', cp.email,
          'role', cp.role,
          'avatar_url', cp.avatar_url
        )
        FROM profiles cp
        WHERE cp.id = s.coach_id
      ),
      'mentor', (
        SELECT jsonb_build_object(
          'id', mp.id,
          'full_name', mp.full_name,
          'email', mp.email,
          'role', mp.role,
          'avatar_url', mp.avatar_url
        )
        FROM profiles mp
        WHERE mp.id = s.mentor_id
      )
    )
  )
  INTO student_data
  FROM profiles p
  JOIN students s ON s.id = p.id
  WHERE p.id = student_id;

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
      ORDER BY pi.created_at DESC
      LIMIT 1
    )
  )
  INTO latest_review
  FROM performance_reviews pr
  WHERE pr.student_id = student_id
  ORDER BY pr.review_date DESC
  LIMIT 1;

  -- Get mock interviews
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', mi.id,
      'interview_date', mi.interview_date,
      'interview_type', mi.interview_type,
      'recording_url', mi.recording_url,
      'overall_rating', mi.overall_rating,
      'strengths', mi.strengths,
      'areas_for_improvement', mi.areas_for_improvement,
      'evaluation_notes', mi.evaluation_notes,
      'worksheet_completion_status', mi.worksheet_completion_status,
      'interviewer', (
        SELECT jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'role', p.role
        )
        FROM profiles p
        WHERE p.id = mi.interviewer_id
      )
    )
  )
  INTO mock_interviews
  FROM mock_interviews mi
  WHERE mi.student_id = student_id
  ORDER BY mi.interview_date DESC;

  -- Get office hours
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oh.id,
      'session_date', oh.session_date,
      'duration_minutes', oh.duration_minutes,
      'recording_url', oh.recording_url,
      'meeting_notes', oh.meeting_notes,
      'topics_covered', oh.topics_covered,
      'action_items', oh.action_items,
      'coach', (
        SELECT jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'role', p.role
        )
        FROM profiles p
        WHERE p.id = oh.coach_id
      )
    )
  )
  INTO office_hours
  FROM office_hours oh
  WHERE oh.student_id = student_id
  ORDER BY oh.session_date DESC;

  -- Get resume versions
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', rv.id,
      'version_number', rv.version_number,
      'file_url', rv.file_url,
      'feedback', rv.feedback,
      'status', rv.status,
      'created_at', rv.created_at,
      'reviewed_by', (
        SELECT jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'email', p.email,
          'role', p.role
        )
        FROM profiles p
        WHERE p.id = rv.reviewed_by
      )
    )
  )
  INTO resume_versions
  FROM resume_versions rv
  WHERE rv.student_id = student_id
  ORDER BY rv.version_number DESC;

  -- Return combined data
  RETURN jsonb_build_object(
    'profile', student_data->'profile',
    'student', student_data->'student',
    'latest_review', latest_review,
    'mock_interviews', COALESCE(mock_interviews, '[]'::jsonb),
    'office_hours', COALESCE(office_hours, '[]'::jsonb),
    'resume_versions', COALESCE(resume_versions, '[]'::jsonb)
  );
END;
$$;

-- Update the fetchStudentPerformance RPC function with better error handling
CREATE OR REPLACE FUNCTION fetch_student_performance(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if student exists
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_student_id 
    AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

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

-- Function to get performance metrics with better error handling
CREATE OR REPLACE FUNCTION get_performance_metrics(student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metrics jsonb;
BEGIN
  -- Check if student exists
  IF NOT EXISTS (
    SELECT 1 FROM students 
    WHERE id = student_id
  ) THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  SELECT jsonb_build_object(
    'application_rate', COALESCE(
      (SELECT COUNT(*)
       FROM job_applications ja
       WHERE ja.student_id = student_id
       AND ja.application_date >= date_trunc('week', CURRENT_DATE)
      ), 0
    ),
    'application_goal', COALESCE(
      (SELECT weekly_application_goal
       FROM students
       WHERE id = student_id
      ), 5
    ),
    'response_rate', COALESCE(
      (SELECT 
        ROUND(
          COUNT(*) FILTER (WHERE status NOT IN ('draft', 'applied'))::numeric / 
          NULLIF(COUNT(*), 0) * 100
        )
       FROM job_applications ja
       WHERE ja.student_id = student_id
       AND ja.application_date >= date_trunc('month', CURRENT_DATE)
      ), 0
    ),
    'interview_rate', COALESCE(
      (SELECT 
        ROUND(
          COUNT(*) FILTER (WHERE status = 'interview')::numeric / 
          NULLIF(COUNT(*), 0) * 100
        )
       FROM job_applications ja
       WHERE ja.student_id = student_id
       AND ja.application_date >= date_trunc('month', CURRENT_DATE)
      ), 0
    ),
    'technical_readiness', COALESCE(
      (SELECT pi.technical_proficiency
       FROM performance_reviews pr
       JOIN performance_indicators pi ON pi.review_id = pr.id
       WHERE pr.student_id = student_id
       ORDER BY pr.review_date DESC
       LIMIT 1
      ), 5
    ),
    'behavioral_readiness', COALESCE(
      (SELECT pi.behavioral_performance
       FROM performance_reviews pr
       JOIN performance_indicators pi ON pi.review_id = pr.id
       WHERE pr.student_id = student_id
       ORDER BY pr.review_date DESC
       LIMIT 1
      ), 5
    ),
    'resume_quality', COALESCE(
      (SELECT pi.resume_quality
       FROM performance_reviews pr
       JOIN performance_indicators pi ON pi.review_id = pr.id
       WHERE pr.student_id = student_id
       ORDER BY pr.review_date DESC
       LIMIT 1
      ), 5
    )
  )
  INTO metrics;

  RETURN metrics;
END;
$$;