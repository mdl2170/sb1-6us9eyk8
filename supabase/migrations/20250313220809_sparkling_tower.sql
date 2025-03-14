/*
  # Update attention level history function to support date ranges
  
  1. Changes
    - Add start_date and end_date parameters
    - Remove p_months parameter
    - Update query to use date range instead of months lookback
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_attention_level_history(uuid, integer);

-- Create new version with date range support
CREATE OR REPLACE FUNCTION get_attention_level_history(
  p_coach_id uuid,
  start_date date,
  end_date date
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
  IF start_date > end_date THEN
    RAISE EXCEPTION 'start_date must be before or equal to end_date';
  END IF;

  -- Limit range to 36 months
  IF (end_date - start_date) > interval '36 months' THEN
    RAISE EXCEPTION 'Date range cannot exceed 36 months';
  END IF;

  RETURN QUERY
  WITH RECURSIVE months AS (
    -- Generate series of months between start and end date
    SELECT generate_series(
      date_trunc('month', start_date)::date,
      date_trunc('month', end_date)::date,
      '1 month'::interval
    )::date AS month_start
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
            AND pr.review_date <= (m.month_start + interval '1 month' - interval '1 day')::date
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
    m.month_start::date as month,
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