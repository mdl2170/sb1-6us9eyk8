-- Drop performance_indicators table and its dependencies
DROP TABLE IF EXISTS performance_indicators CASCADE;

-- Add indicator fields to performance_reviews table
ALTER TABLE performance_reviews
ADD COLUMN resume_quality integer CHECK (resume_quality BETWEEN 0 AND 10),
ADD COLUMN application_effectiveness integer CHECK (application_effectiveness BETWEEN 0 AND 10),
ADD COLUMN behavioral_performance integer CHECK (behavioral_performance BETWEEN 0 AND 10),
ADD COLUMN networking_capability integer CHECK (networking_capability BETWEEN 0 AND 10),
ADD COLUMN technical_proficiency integer CHECK (technical_proficiency BETWEEN 0 AND 10),
ADD COLUMN energy_level integer CHECK (energy_level BETWEEN 0 AND 10),
ADD COLUMN indicator_notes jsonb DEFAULT '{}'::jsonb;

-- Function to calculate weighted performance score
CREATE OR REPLACE FUNCTION calculate_performance_score(review_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  review record;
BEGIN
  SELECT * INTO review
  FROM performance_reviews
  WHERE id = review_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN (
    (COALESCE(review.resume_quality, 0) * 0.10) +
    (COALESCE(review.application_effectiveness, 0) * 0.10) +
    (COALESCE(review.behavioral_performance, 0) * 0.10) +
    (COALESCE(review.networking_capability, 0) * 0.20) +
    (COALESCE(review.technical_proficiency, 0) * 0.30) +
    (COALESCE(review.energy_level, 0) * 0.20)
  );
END;
$$;

-- Function to create performance review
CREATE OR REPLACE FUNCTION create_performance_review(
  p_student_id uuid,
  p_review_date date,
  p_attention_level attention_level,
  p_performance_rating performance_rating,
  p_overall_notes text,
  p_resume_quality integer,
  p_application_effectiveness integer,
  p_behavioral_performance integer,
  p_networking_capability integer,
  p_technical_proficiency integer,
  p_energy_level integer,
  p_indicator_notes jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_id uuid;
BEGIN
  -- Insert performance review
  INSERT INTO performance_reviews (
    student_id,
    review_date,
    attention_level,
    performance_rating,
    overall_notes,
    resume_quality,
    application_effectiveness,
    behavioral_performance,
    networking_capability,
    technical_proficiency,
    energy_level,
    indicator_notes,
    coach_id,
    created_at,
    updated_at
  )
  VALUES (
    p_student_id,
    p_review_date,
    p_attention_level,
    p_performance_rating,
    p_overall_notes,
    p_resume_quality,
    p_application_effectiveness,
    p_behavioral_performance,
    p_networking_capability,
    p_technical_proficiency,
    p_energy_level,
    COALESCE(p_indicator_notes, '{}'::jsonb),
    auth.uid(),
    now(),
    now()
  )
  RETURNING id INTO v_review_id;

  -- Update student's last review date
  UPDATE students
  SET 
    last_review_date = p_review_date,
    attention_level = p_attention_level,
    performance_rating = p_performance_rating,
    updated_at = now()
  WHERE id = p_student_id;

  RETURN v_review_id;
END;
$$;

-- Function to update performance review
CREATE OR REPLACE FUNCTION update_performance_review(
  p_review_id uuid,
  p_attention_level attention_level,
  p_performance_rating performance_rating,
  p_overall_notes text,
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

  -- Update performance review
  UPDATE performance_reviews
  SET 
    attention_level = p_attention_level,
    performance_rating = p_performance_rating,
    overall_notes = p_overall_notes,
    resume_quality = p_resume_quality,
    application_effectiveness = p_application_effectiveness,
    behavioral_performance = p_behavioral_performance,
    networking_capability = p_networking_capability,
    technical_proficiency = p_technical_proficiency,
    energy_level = p_energy_level,
    indicator_notes = COALESCE(p_indicator_notes, indicator_notes),
    updated_at = now()
  WHERE id = p_review_id;

  -- Update student's latest review info
  WITH latest_review AS (
    SELECT 
      student_id,
      attention_level,
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
    attention_level = lr.attention_level,
    performance_rating = lr.performance_rating,
    last_review_date = lr.review_date,
    updated_at = now()
  FROM latest_review lr
  WHERE s.id = lr.student_id;
END;
$$;