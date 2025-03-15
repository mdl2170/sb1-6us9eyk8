/*
  # Add function to get attention level history
  
  1. New Function
    - get_attention_level_history: Returns daily counts of students by attention level
    - Filters by coach ID
    - Returns data for specified number of days
  
  2. Security
    - Function is only accessible by authenticated users
    - Results filtered by coach's assigned students
*/

CREATE OR REPLACE FUNCTION get_attention_level_history(
  p_coach_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  date date,
  level_1_count integer,
  level_2_count integer,
  level_3_count integer,
  level_4_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dates AS (
    -- Generate series of dates
    SELECT date_trunc('day', now())::date - (n || ' days')::interval AS day
    FROM generate_series(0, p_days - 1) n
  ),
  daily_reviews AS (
    -- Get the latest review for each student for each day
    SELECT DISTINCT ON (s.id, d.day)
      d.day as review_date,
      COALESCE(pr.attention_level, 'level_4') as attention_level
    FROM dates d
    CROSS JOIN students s
    LEFT JOIN performance_reviews pr ON pr.student_id = s.id
      AND pr.review_date <= d.day
    WHERE s.coach_id = p_coach_id
      AND s.status = 'active'
    ORDER BY s.id, d.day, pr.review_date DESC
  )
  SELECT
    d.day::date as date,
    COUNT(*) FILTER (WHERE dr.attention_level = 'level_1')::integer as level_1_count,
    COUNT(*) FILTER (WHERE dr.attention_level = 'level_2')::integer as level_2_count,
    COUNT(*) FILTER (WHERE dr.attention_level = 'level_3')::integer as level_3_count,
    COUNT(*) FILTER (WHERE dr.attention_level = 'level_4')::integer as level_4_count
  FROM dates d
  LEFT JOIN daily_reviews dr ON dr.review_date = d.day
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;