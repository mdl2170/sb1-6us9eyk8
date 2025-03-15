/*
  # Add function to get activity trends
  
  1. New Function
    - get_activity_trends: Returns monthly totals of applications and networking interactions
    - Filters by coach ID and date range
    - Groups by month for trend analysis
*/

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
  monthly_totals AS (
    -- Calculate monthly totals for applications and networking
    SELECT
      date_trunc('month', ja.application_date)::date as month,
      COUNT(DISTINCT ja.id) as applications,
      COUNT(DISTINCT ni.id) as networking
    FROM students s
    LEFT JOIN job_applications ja ON ja.student_id = s.id
      AND ja.application_date BETWEEN start_date AND end_date
    LEFT JOIN networking_interactions ni ON ni.student_id = s.id
      AND ni.interaction_date BETWEEN start_date AND end_date
    WHERE s.coach_id = p_coach_id
      AND s.status = 'active'
    GROUP BY date_trunc('month', ja.application_date)::date
  )
  SELECT
    m.month_start as month,
    COALESCE(mt.applications, 0) as total_applications,
    COALESCE(mt.networking, 0) as total_networking
  FROM months m
  LEFT JOIN monthly_totals mt ON mt.month = m.month_start
  ORDER BY m.month_start;
END;
$$;