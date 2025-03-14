/*
  # Add function to get task metrics
  
  1. New Function
    - get_task_metrics: Returns monthly task statistics
    - Tracks total, completed, pending, and overdue tasks
    - Groups by month for trend analysis
*/

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
    -- Generate series of months between start and end date
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
    AND t.created_at BETWEEN start_date AND end_date
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