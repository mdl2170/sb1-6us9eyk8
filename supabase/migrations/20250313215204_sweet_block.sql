/*
  # Fix attention level history function
  
  1. Changes
    - Drop ALL existing versions of the function
    - Ensure attention_level type exists
    - Create single, clean version of the function
*/

-- Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS get_attention_level_history(uuid, integer);
DROP FUNCTION IF EXISTS get_attention_level_history(uuid, json);
DROP FUNCTION IF EXISTS get_attention_level_history(uuid, jsonb);
DROP FUNCTION IF EXISTS get_attention_level_history(p_coach_id uuid, p_months integer);
DROP FUNCTION IF EXISTS get_attention_level_history(p_coach_id uuid, p_days integer);

-- Ensure attention_level type exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attention_level') THEN
    CREATE TYPE attention_level AS ENUM ('highest', 'high', 'medium', 'low');
  END IF;
END $$;

-- Create new version of the function
CREATE OR REPLACE FUNCTION get_attention_level_history(
  p_coach_id uuid,
  p_months integer DEFAULT 12
)
RETURNS TABLE (
  month date,
  attention_levels jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input parameters
  IF p_months < 1 OR p_months > 36 THEN
    RAISE EXCEPTION 'p_months must be between 1 and 36';
  END IF;

  RETURN QUERY
  WITH RECURSIVE months AS (
    -- Generate series of months
    SELECT date_trunc('month', now())::date - (n || ' months')::interval AS month_start
    FROM generate_series(0, p_months - 1) n
  ),
  student_reviews AS (
    -- Get all students assigned to the coach with their latest review for each month
    SELECT 
      s.id as student_id,
      m.month_start,
      COALESCE(
        (
          SELECT attention_level
          FROM performance_reviews pr
          WHERE pr.student_id = s.id
            AND pr.review_date <= m.month_start + interval '1 month' - interval '1 day'
          ORDER BY pr.review_date DESC
          LIMIT 1
        ),
        'low'::attention_level
      ) as attention_level
    FROM months m
    CROSS JOIN students s
    WHERE s.coach_id = p_coach_id
      AND s.status = 'active'
  ),
  monthly_counts AS (
    -- Calculate counts for each attention level
    SELECT
      month_start as month,
      jsonb_build_object(
        'highest', COUNT(*) FILTER (WHERE attention_level = 'highest'),
        'high', COUNT(*) FILTER (WHERE attention_level = 'high'),
        'medium', COUNT(*) FILTER (WHERE attention_level = 'medium'),
        'low', COUNT(*) FILTER (WHERE attention_level = 'low'),
        'total', COUNT(*)
      ) as attention_levels
    FROM student_reviews
    GROUP BY month_start
  )
  SELECT
    m.month_start as month,
    COALESCE(mc.attention_levels, jsonb_build_object(
      'highest', 0,
      'high', 0,
      'medium', 0,
      'low', 0,
      'total', 0
    )) as attention_levels
  FROM months m
  LEFT JOIN monthly_counts mc ON mc.month = m.month_start
  ORDER BY m.month_start;
END;
$$;