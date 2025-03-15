/*
  # Fix attention level enum and function
  
  1. Changes
    - Drop existing function first
    - Drop and recreate attention_level enum with correct values
    - Recreate function with new return type
  
  2. Security
    - Maintain security definer setting
    - Keep same search path restrictions
*/

-- Drop existing function first
DROP FUNCTION IF EXISTS get_attention_level_history(uuid, integer);

-- Drop and recreate attention_level enum with correct values
DROP TYPE IF EXISTS attention_level CASCADE;
CREATE TYPE attention_level AS ENUM ('highest', 'high', 'medium', 'low');

-- Recreate the function with new return type
CREATE OR REPLACE FUNCTION get_attention_level_history(
  p_coach_id uuid,
  p_months integer DEFAULT 12
)
RETURNS TABLE (
  month date,
  highest_count integer,
  high_count integer,
  medium_count integer,
  low_count integer
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
      COALESCE(pr.attention_level, 'low') as attention_level
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
    COUNT(*) FILTER (WHERE mr.attention_level = 'highest')::integer as highest_count,
    COUNT(*) FILTER (WHERE mr.attention_level = 'high')::integer as high_count,
    COUNT(*) FILTER (WHERE mr.attention_level = 'medium')::integer as medium_count,
    COUNT(*) FILTER (WHERE mr.attention_level = 'low')::integer as low_count
  FROM months m
  LEFT JOIN monthly_reviews mr ON mr.month_start = m.month_start
  GROUP BY m.month_start
  ORDER BY m.month_start;
END;
$$;