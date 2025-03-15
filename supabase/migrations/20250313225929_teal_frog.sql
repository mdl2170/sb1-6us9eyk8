/*
  # Add function to get student performance history
  
  1. New Function
    - get_student_performance_history: Returns monthly distribution of various performance indicators
    - Includes attention levels, performance ratings, and other metrics
    - Supports date range filtering
*/

CREATE OR REPLACE FUNCTION get_student_performance_history(
  p_coach_id uuid,
  start_date date,
  end_date date
)
RETURNS TABLE (
  month date,
  attention_levels jsonb,
  performance_counts jsonb,
  energy_counts jsonb,
  technical_counts jsonb,
  behavioral_counts jsonb,
  networking_counts jsonb
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
  IF date_part('month', age(end_date, start_date)) > 36 THEN
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
          SELECT row_to_json(pr.*)
          FROM performance_reviews pr
          WHERE pr.student_id = s.id
            AND pr.review_date <= (m.month_start + interval '1 month' - interval '1 day')::date
          ORDER BY pr.review_date DESC
          LIMIT 1
        ),
        '{}'::json
      ) as review_data
    FROM months m
    CROSS JOIN students s
    WHERE s.coach_id = p_coach_id
      AND s.status = 'active'
  ),
  monthly_counts AS (
    -- Calculate counts for each metric
    SELECT
      month_start as month,
      -- Attention levels
      jsonb_build_object(
        'highest', COUNT(*) FILTER (WHERE (review_data->>'attention_level')::attention_level = 'highest'),
        'high', COUNT(*) FILTER (WHERE (review_data->>'attention_level')::attention_level = 'high'),
        'medium', COUNT(*) FILTER (WHERE (review_data->>'attention_level')::attention_level = 'medium'),
        'low', COUNT(*) FILTER (WHERE (review_data->>'attention_level')::attention_level = 'low'),
        'total', COUNT(*)
      ) as attention_levels,
      -- Performance ratings
      jsonb_build_object(
        'outstanding', COUNT(*) FILTER (WHERE (review_data->>'performance_rating')::performance_rating = 'outstanding'),
        'medium', COUNT(*) FILTER (WHERE (review_data->>'performance_rating')::performance_rating = 'medium'),
        'red_flag', COUNT(*) FILTER (WHERE (review_data->>'performance_rating')::performance_rating = 'red_flag')
      ) as performance_counts,
      -- Energy levels
      jsonb_build_object(
        '1', COUNT(*) FILTER (WHERE (review_data->>'energy_level')::int = 1),
        '2', COUNT(*) FILTER (WHERE (review_data->>'energy_level')::int = 2),
        '3', COUNT(*) FILTER (WHERE (review_data->>'energy_level')::int = 3),
        '4', COUNT(*) FILTER (WHERE (review_data->>'energy_level')::int = 4),
        '5', COUNT(*) FILTER (WHERE (review_data->>'energy_level')::int = 5)
      ) as energy_counts,
      -- Technical proficiency
      jsonb_build_object(
        '1', COUNT(*) FILTER (WHERE (review_data->>'technical_proficiency')::int = 1),
        '2', COUNT(*) FILTER (WHERE (review_data->>'technical_proficiency')::int = 2),
        '3', COUNT(*) FILTER (WHERE (review_data->>'technical_proficiency')::int = 3),
        '4', COUNT(*) FILTER (WHERE (review_data->>'technical_proficiency')::int = 4),
        '5', COUNT(*) FILTER (WHERE (review_data->>'technical_proficiency')::int = 5)
      ) as technical_counts,
      -- Behavioral performance
      jsonb_build_object(
        '1', COUNT(*) FILTER (WHERE (review_data->>'behavioral_performance')::int = 1),
        '2', COUNT(*) FILTER (WHERE (review_data->>'behavioral_performance')::int = 2),
        '3', COUNT(*) FILTER (WHERE (review_data->>'behavioral_performance')::int = 3),
        '4', COUNT(*) FILTER (WHERE (review_data->>'behavioral_performance')::int = 4),
        '5', COUNT(*) FILTER (WHERE (review_data->>'behavioral_performance')::int = 5)
      ) as behavioral_counts,
      -- Networking capability
      jsonb_build_object(
        '1', COUNT(*) FILTER (WHERE (review_data->>'networking_capability')::int = 1),
        '2', COUNT(*) FILTER (WHERE (review_data->>'networking_capability')::int = 2),
        '3', COUNT(*) FILTER (WHERE (review_data->>'networking_capability')::int = 3),
        '4', COUNT(*) FILTER (WHERE (review_data->>'networking_capability')::int = 4),
        '5', COUNT(*) FILTER (WHERE (review_data->>'networking_capability')::int = 5)
      ) as networking_counts
    FROM student_reviews
    GROUP BY month_start
  )
  SELECT
    m.month_start::date as month,
    COALESCE(mc.attention_levels, jsonb_build_object(
      'highest', 0, 'high', 0, 'medium', 0, 'low', 0, 'total', 0
    )) as attention_levels,
    COALESCE(mc.performance_counts, jsonb_build_object(
      'outstanding', 0, 'medium', 0, 'red_flag', 0
    )) as performance_counts,
    COALESCE(mc.energy_counts, jsonb_build_object(
      '1', 0, '2', 0, '3', 0, '4', 0, '5', 0
    )) as energy_counts,
    COALESCE(mc.technical_counts, jsonb_build_object(
      '1', 0, '2', 0, '3', 0, '4', 0, '5', 0
    )) as technical_counts,
    COALESCE(mc.behavioral_counts, jsonb_build_object(
      '1', 0, '2', 0, '3', 0, '4', 0, '5', 0
    )) as behavioral_counts,
    COALESCE(mc.networking_counts, jsonb_build_object(
      '1', 0, '2', 0, '3', 0, '4', 0, '5', 0
    )) as networking_counts
  FROM months m
  LEFT JOIN monthly_counts mc ON mc.month = m.month_start
  ORDER BY m.month_start;
END;
$$;