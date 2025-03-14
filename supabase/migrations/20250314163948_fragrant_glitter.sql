/*
  # Fix activity trends function
  
  1. Changes
    - Fix monthly grouping in get_activity_trends function
    - Ensure proper date handling for all metrics
    - Add proper NULL handling
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_activity_trends(uuid, date, date);

-- Create new version with fixed date handling
CREATE OR REPLACE FUNCTION get_activity_trends(
  p_coach_id uuid,
  start_date date,
  end_date date
)
RETURNS TABLE (
  month date,
  total_applications bigint,
  total_networking bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE months AS (
    -- Generate series of months between start and end date
    SELECT generate_series(
      date_trunc('month', start_date)::date,
      date_trunc('month', end_date)::date,
      '1 month'::interval
    )::date AS month_start
  ),
  student_list AS (
    -- Get all active students for this coach
    SELECT id
    FROM students
    WHERE coach_id = p_coach_id
      AND status = 'active'
  ),
  monthly_totals AS (
    -- Calculate monthly totals for applications
    SELECT
      date_trunc('month', application_date)::date as month,
      COUNT(*) as applications
    FROM job_applications ja
    WHERE ja.student_id IN (SELECT id FROM student_list)
      AND application_date BETWEEN start_date AND end_date
    GROUP BY date_trunc('month', application_date)::date
  ),
  networking_totals AS (
    -- Calculate monthly totals for networking
    SELECT
      date_trunc('month', interaction_date)::date as month,
      COUNT(*) as networking
    FROM networking_interactions ni
    WHERE ni.student_id IN (SELECT id FROM student_list)
      AND interaction_date BETWEEN start_date AND end_date
    GROUP BY date_trunc('month', interaction_date)::date
  )
  SELECT
    m.month_start as month,
    COALESCE(mt.applications, 0) as total_applications,
    COALESCE(nt.networking, 0) as total_networking
  FROM months m
  LEFT JOIN monthly_totals mt ON mt.month = m.month_start
  LEFT JOIN networking_totals nt ON nt.month = m.month_start
  ORDER BY m.month_start;
END;
$$;