-- Drop existing materialized view and related objects
DROP MATERIALIZED VIEW IF EXISTS student_latest_performance;
DROP TRIGGER IF EXISTS refresh_student_performance_on_review ON performance_reviews;
DROP FUNCTION IF EXISTS refresh_student_performance();

-- Update the update_performance_review function to handle indicators correctly
CREATE OR REPLACE FUNCTION update_performance_review(
  p_review_id uuid,
  p_resume_quality integer,
  p_application_effectiveness integer,
  p_behavioral_performance integer,
  p_networking_capability integer,
  p_technical_proficiency integer,
  p_energy_level integer,
  p_indicator_notes jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM performance_reviews pr
    WHERE pr.id = p_review_id
    AND (
      pr.coach_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this performance review';
  END IF;

  -- Update performance review indicators
  UPDATE performance_reviews
  SET 
    resume_quality = p_resume_quality,
    application_effectiveness = p_application_effectiveness,
    behavioral_performance = p_behavioral_performance,
    networking_capability = p_networking_capability,
    technical_proficiency = p_technical_proficiency,
    energy_level = p_energy_level,
    indicator_notes = COALESCE(p_indicator_notes, indicator_notes),
    updated_at = now()
  WHERE id = p_review_id;

  -- Calculate performance rating based on indicators
  WITH weighted_score AS (
    SELECT 
      (p_resume_quality * 0.10 +
       p_application_effectiveness * 0.10 +
       p_behavioral_performance * 0.10 +
       p_networking_capability * 0.20 +
       p_technical_proficiency * 0.30 +
       p_energy_level * 0.20) as score
  )
  UPDATE performance_reviews
  SET performance_rating = 
    CASE 
      WHEN p_energy_level < 2 THEN 'red_flag'
      WHEN (SELECT score FROM weighted_score) >= 4 THEN 'outstanding'
      ELSE 'medium'
    END
  WHERE id = p_review_id;

  -- Update student's latest review info
  WITH latest_review AS (
    SELECT 
      student_id,
      performance_rating,
      review_date
    FROM performance_reviews
    WHERE student_id = (
      SELECT student_id 
      FROM performance_reviews 
      WHERE id = p_review_id
    )
    ORDER BY review_date DESC
    LIMIT 1
  )
  UPDATE students s
  SET 
    performance_rating = lr.performance_rating,
    last_review_date = lr.review_date,
    updated_at = now()
  FROM latest_review lr
  WHERE s.id = lr.student_id;
END;
$$;