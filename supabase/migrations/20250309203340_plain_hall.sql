/*
  # Update Performance Review Triggers

  1. Changes
    - Modify update_performance_rating() trigger function to respect manually set values
    - Only calculate performance_rating and attention_level if they are NULL
    - Keep existing values if they are explicitly set

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Drop existing trigger function
DROP FUNCTION IF EXISTS update_performance_rating CASCADE;

-- Create updated trigger function
CREATE OR REPLACE FUNCTION update_performance_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_score NUMERIC;
BEGIN
  -- Calculate weighted average score
  avg_score := (
    NEW.resume_quality * 0.10 +
    NEW.application_effectiveness * 0.10 +
    NEW.behavioral_performance * 0.10 +
    NEW.networking_capability * 0.20 +
    NEW.technical_proficiency * 0.30 +
    NEW.energy_level * 0.20
  );

  -- Only set performance_rating if it's NULL
  IF NEW.performance_rating IS NULL THEN
    -- Set performance rating based on average score and energy level
    IF NEW.energy_level <= 2 THEN
      NEW.performance_rating := 'red_flag';
    ELSIF avg_score >= 4 THEN
      NEW.performance_rating := 'outstanding';
    ELSE
      NEW.performance_rating := 'medium';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER before_performance_review_insert_update
  BEFORE INSERT OR UPDATE ON performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_rating();

-- Drop existing attention level trigger function
DROP FUNCTION IF EXISTS update_student_attention_level CASCADE;

-- Create updated attention level trigger function
CREATE OR REPLACE FUNCTION update_student_attention_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set attention_level if it's NULL
  IF NEW.attention_level IS NULL THEN
    -- Default to 'low' attention level
    NEW.attention_level := 'low';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_attention_level
  BEFORE INSERT OR UPDATE ON performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_student_attention_level();