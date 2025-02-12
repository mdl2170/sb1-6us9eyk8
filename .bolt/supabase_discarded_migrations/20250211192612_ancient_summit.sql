-- Drop existing function
DROP FUNCTION IF EXISTS calculate_application_metrics(uuid, date, date);

-- Create new function with proper parameter names and API exposure
CREATE OR REPLACE FUNCTION calculate_application_metrics(
  student_id uuid,
  start_date date,
  end_date date
)
RETURNS TABLE (
  total_applications integer,
  applications_by_status jsonb,
  response_rate numeric,
  interview_rate numeric,
  offer_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has access to this student's data
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      id = student_id OR  -- User is viewing their own data
      role IN ('admin', 'coach', 'mentor')  -- User is staff
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH metrics AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status NOT IN ('draft', 'applied')) as responses,
      COUNT(*) FILTER (WHERE status = 'interview') as interviews,
      COUNT(*) FILTER (WHERE status = 'offer') as offers,
      jsonb_object_agg(status, COUNT(*)) as status_counts
    FROM job_applications
    WHERE student_id = calculate_application_metrics.student_id
    AND application_date BETWEEN start_date AND end_date
  )
  SELECT
    total as total_applications,
    COALESCE(status_counts, '{}'::jsonb) as applications_by_status,
    COALESCE(ROUND((responses * 100.0) / NULLIF(total, 0), 2), 0.0) as response_rate,
    COALESCE(ROUND((interviews * 100.0) / NULLIF(total, 0), 2), 0.0) as interview_rate,
    COALESCE(ROUND((offers * 100.0) / NULLIF(total, 0), 2), 0.0) as offer_rate
  FROM metrics;
END;
$$;