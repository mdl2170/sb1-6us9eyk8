/*
  # Add Weekly Progress Generation Functions

  1. New Functions
    - generate_weekly_progress_review: Generates a weekly progress review for a student
    - update_weekly_progress_reviews: Updates all weekly progress reviews for a date range

  2. Changes
    - Adds automatic progress review generation based on applications and networking data
    - Calculates application goals and networking targets
    - Provides response rates and other metrics
*/

-- Function to generate a weekly progress review for a specific week
CREATE OR REPLACE FUNCTION generate_weekly_progress_review(
  p_student_id uuid,
  p_week_start date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_week_end date;
  v_applications_goal integer;
  v_applications_submitted integer;
  v_response_rate numeric;
  v_networking_target_met boolean;
  v_review_id uuid;
BEGIN
  -- Calculate week end date
  p_week_end := p_week_start + interval '6 days';

  -- Get student's weekly application goal
  SELECT COALESCE(weekly_application_goal, 5)
  INTO v_applications_goal
  FROM career_goals
  WHERE student_id = p_student_id;

  -- Count applications submitted this week
  SELECT COUNT(*)
  INTO v_applications_submitted
  FROM job_applications
  WHERE student_id = p_student_id
  AND application_date BETWEEN p_week_start AND p_week_end;

  -- Calculate response rate for the week
  SELECT 
    COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE status NOT IN ('draft', 'applied')) * 100.0) / 
        NULLIF(COUNT(*), 0),
        2
      ),
      0.0
    )
  INTO v_response_rate
  FROM job_applications
  WHERE student_id = p_student_id
  AND application_date BETWEEN p_week_start AND p_week_end;

  -- Check if networking target was met
  -- Target is met if the student had at least 2 networking interactions in the week
  SELECT COUNT(*) >= 2
  INTO v_networking_target_met
  FROM networking_interactions
  WHERE student_id = p_student_id
  AND interaction_date BETWEEN p_week_start AND p_week_end;

  -- Create or update weekly progress review
  INSERT INTO weekly_progress_reviews (
    student_id,
    week_start_date,
    applications_submitted,
    applications_goal,
    response_rate,
    networking_target_met,
    created_at,
    updated_at
  )
  VALUES (
    p_student_id,
    p_week_start,
    v_applications_submitted,
    v_applications_goal,
    v_response_rate,
    v_networking_target_met,
    now(),
    now()
  )
  ON CONFLICT (student_id, week_start_date)
  DO UPDATE SET
    applications_submitted = EXCLUDED.applications_submitted,
    applications_goal = EXCLUDED.applications_goal,
    response_rate = EXCLUDED.response_rate,
    networking_target_met = EXCLUDED.networking_target_met,
    updated_at = now()
  RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$$;

-- Function to update all weekly progress reviews for a date range
CREATE OR REPLACE FUNCTION update_weekly_progress_reviews(
  p_student_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_week date;
  v_reviews_updated integer := 0;
BEGIN
  -- Verify user has access to update progress reviews
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      id = p_student_id OR  -- User is updating their own reviews
      role IN ('admin', 'coach', 'mentor')  -- User is staff
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Start from the Monday of the start date
  v_current_week := p_start_date - EXTRACT(DOW FROM p_start_date)::integer + 1;

  -- Generate reviews for each week
  WHILE v_current_week <= p_end_date LOOP
    PERFORM generate_weekly_progress_review(p_student_id, v_current_week);
    v_reviews_updated := v_reviews_updated + 1;
    v_current_week := v_current_week + interval '7 days';
  END LOOP;

  RETURN v_reviews_updated;
END;
$$;

-- Add unique constraint for student_id and week_start_date
ALTER TABLE weekly_progress_reviews
ADD CONSTRAINT weekly_progress_reviews_student_week_key 
UNIQUE (student_id, week_start_date);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_weekly_progress_review(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION update_weekly_progress_reviews(uuid, date, date) TO authenticated;