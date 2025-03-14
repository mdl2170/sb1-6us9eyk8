/*
  # Add student population overview function
  
  1. New Function
    - get_student_overview: Returns key metrics about student population
    - Includes total active students, completion time, and success rate
    - Filters by coach ID
*/

CREATE OR REPLACE FUNCTION get_student_overview(
  p_coach_id uuid
)
RETURNS TABLE (
  total_active_students bigint,
  avg_completion_days numeric,
  success_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH completion_stats AS (
    SELECT
      COUNT(*) FILTER (
        WHERE s.status = 'active'
      ) as active_count,
      AVG(
        EXTRACT(DAY FROM age(s.actual_end_date, s.program_start_date))
      ) FILTER (
        WHERE s.actual_end_date IS NOT NULL
      ) as avg_days,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM job_applications ja
          WHERE ja.student_id = s.id
          AND ja.status = 'offer'
        )
      )::numeric / NULLIF(COUNT(*), 0) * 100 as offer_rate
    FROM students s
    WHERE s.coach_id = p_coach_id
  )
  SELECT
    active_count as total_active_students,
    ROUND(avg_days, 1) as avg_completion_days,
    ROUND(offer_rate, 1) as success_rate
  FROM completion_stats;
END;
$$;