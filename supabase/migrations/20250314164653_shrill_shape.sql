/*
  # Fix date handling in metrics functions
  
  1. Changes
    - Fix date handling in get_activity_trends function
    - Fix date handling in get_task_metrics function
    - Ensure dates are correctly aligned with data
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS get_activity_trends(uuid, date, date);
DROP FUNCTION IF EXISTS get_task_metrics(uuid, date, date);

-- Create new version of get_activity_trends with fixed date handling
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
    -- Generate series of months starting from the first day of start_date's month
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
      AND application_date >= start_date
      AND application_date < date_trunc('month', end_date + interval '1 month')::date
    GROUP BY date_trunc('month', application_date)::date
  ),
  networking_totals AS (
    -- Calculate monthly totals for networking
    SELECT
      date_trunc('month', interaction_date)::date as month,
      COUNT(*) as networking
    FROM networking_interactions ni
    WHERE ni.student_id IN (SELECT id FROM student_list)
      AND interaction_date >= start_date
      AND interaction_date < date_trunc('month', end_date + interval '1 month')::date
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

-- Create new version of get_task_metrics with fixed date handling
CREATE OR REPLACE FUNCTION get_task_metrics(
  p_coach_id uuid,
  start_date date,
  end_date date
)
RETURNS TABLE (
  month date,
  total_tasks bigint,
  completed_tasks bigint,
  pending_tasks bigint,
  overdue_tasks bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE months AS (
    -- Generate series of months starting from the first day of start_date's month
    SELECT generate_series(
      date_trunc('month', start_date)::date,
      date_trunc('month', end_date)::date,
      '1 month'::interval
    )::date AS month_start
  ),
  monthly_metrics AS (
    -- Calculate monthly task metrics
    SELECT
      date_trunc('month', t.created_at)::date as month,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
      COUNT(*) FILTER (WHERE t.status != 'completed') as pending,
      COUNT(*) FILTER (
        WHERE t.status != 'completed' 
        AND t.due_date < CURRENT_DATE
      ) as overdue
    FROM tasks t
    JOIN task_groups tg ON tg.id = t.group_id
    WHERE tg.owner_id IN (
      SELECT s.id 
      FROM students s 
      WHERE s.coach_id = p_coach_id
        AND s.status = 'active'
    )
    AND t.created_at >= start_date
    AND t.created_at < date_trunc('month', end_date + interval '1 month')::date
    GROUP BY date_trunc('month', t.created_at)::date
  )
  SELECT
    m.month_start as month,
    COALESCE(mm.total, 0) as total_tasks,
    COALESCE(mm.completed, 0) as completed_tasks,
    COALESCE(mm.pending, 0) as pending_tasks,
    COALESCE(mm.overdue, 0) as overdue_tasks
  FROM months m
  LEFT JOIN monthly_metrics mm ON mm.month = m.month_start
  ORDER BY m.month_start;
END;
$$;