-- Function to calculate weighted performance score
CREATE OR REPLACE FUNCTION calculate_performance_score(
  resume_quality integer,
  application_effectiveness integer,
  behavioral_performance integer,
  networking_capability integer,
  technical_proficiency integer,
  energy_level integer
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    (COALESCE(resume_quality, 0) * 0.10) +
    (COALESCE(application_effectiveness, 0) * 0.10) +
    (COALESCE(behavioral_performance, 0) * 0.10) +
    (COALESCE(networking_capability, 0) * 0.20) +
    (COALESCE(technical_proficiency, 0) * 0.30) +
    (COALESCE(energy_level, 0) * 0.20)
  );
END;
$$;

-- Function to determine performance rating based on score
CREATE OR REPLACE FUNCTION determine_performance_rating(
  score numeric,
  energy_level integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Red flag if energy level is below 2 or overall score is very low
  IF energy_level < 2 OR score < 2 THEN
    RETURN 'red_flag';
  -- Outstanding if score is 4 or above
  ELSIF score >= 4 THEN
    RETURN 'outstanding';
  -- Medium for everything else
  ELSE
    RETURN 'medium';
  END IF;
END;
$$;

-- Trigger to automatically update performance rating
CREATE OR REPLACE FUNCTION update_performance_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  weighted_score numeric;
BEGIN
  -- Calculate weighted score
  weighted_score := calculate_performance_score(
    NEW.resume_quality,
    NEW.application_effectiveness,
    NEW.behavioral_performance,
    NEW.networking_capability,
    NEW.technical_proficiency,
    NEW.energy_level
  );

  -- Set performance rating based on score and energy level
  NEW.performance_rating := determine_performance_rating(weighted_score, NEW.energy_level);

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS before_performance_review_insert_update ON performance_reviews;
CREATE TRIGGER before_performance_review_insert_update
  BEFORE INSERT OR UPDATE ON performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_rating();