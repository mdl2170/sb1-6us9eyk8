/*
  # Update attention level history function to show monthly data
  
  1. Changes
    - Modify function to return monthly counts instead of daily
    - Add parameter for number of months to look back
    - Group data by month
  
  2. Security
    - Maintain existing security model
    - Function remains security definer
*/

CREATE OR REPLACE FUNCTION get_attention_level_history(
  p_coach_id uuid,
  p_months integer DEFAULT 12
)
RETURNS TABLE (
  month date,
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
  WITH RECURSIVE months AS (
    -- Generate series of months
    SELECT date_trunc('month', now())::date - (n || ' months')::interval AS month_start
    FROM generate_series(0, p_months - 1) n
  ),
  monthly_reviews AS (
    -- Get the latest review for each student for each month
    SELECT DISTINCT ON (s.id, m.month_start)
      m.month_start,
      COALESCE(pr.attention_level, 'level_4') as attention_level
    FROM months m
    CROSS JOIN students s
    LEFT JOIN LATERAL (
      SELECT attention_level, review_date
      FROM performance_reviews
      WHERE student_id = s.id
        AND review_date <= m.month_start + interval '1 month' - interval '1 day'
      ORDER BY review_date DESC
      LIMIT 1
    ) pr ON true
    WHERE s.coach_id = p_coach_id
      AND s.status = 'active'
    ORDER BY s.id, m.month_start, pr.review_date DESC
  )
  SELECT
    m.month_start as month,
    COUNT(*) FILTER (WHERE mr.attention_level = 'level_1')::integer as level_1_count,
    COUNT(*) FILTER (WHERE mr.attention_level = 'level_2')::integer as level_2_count,
    COUNT(*) FILTER (WHERE mr.attention_level = 'level_3')::integer as level_3_count,
    COUNT(*) FILTER (WHERE mr.attention_level = 'level_4')::integer as level_4_count
  FROM months m
  LEFT JOIN monthly_reviews mr ON mr.month_start = m.month_start
  GROUP BY m.month_start
  ORDER BY m.month_start;
END;
$$;