/*
  # Fix attention level in performance reviews
  
  1. Changes
    - Add attention_level column back to performance_reviews if missing
    - Update trigger function to handle attention levels correctly
*/

-- Add attention_level column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_reviews' 
    AND column_name = 'attention_level'
  ) THEN
    ALTER TABLE performance_reviews
    ADD COLUMN attention_level attention_level NOT NULL DEFAULT 'low';
  END IF;
END $$;

-- Update the trigger function to set attention level
CREATE OR REPLACE FUNCTION update_student_attention_level()
RETURNS TRIGGER AS $$
DECLARE
  student_record record;
  months_without_placement integer;
BEGIN
  -- Get student details
  SELECT s.*, 
         EXTRACT(MONTH FROM age(CURRENT_DATE, s.enrollment_date))::integer as months_enrolled
  INTO student_record
  FROM students s
  WHERE s.id = NEW.student_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calculate months without placement
  months_without_placement := student_record.months_enrolled;

  -- Determine attention level based on criteria
  NEW.attention_level := CASE
    -- Highest attention: Senior/Master students, 6+ months without placement, or red flag performance
    WHEN (months_without_placement >= 6 AND student_record.program_type IN ('senior', 'master'))
      OR NEW.performance_rating = 'red_flag'
      THEN 'highest'
    
    -- High attention: Multiple qualifying conditions
    WHEN (months_without_placement >= 4 AND student_record.program_type = 'senior')
      OR (months_without_placement >= 3 AND NEW.performance_rating = 'medium')
      THEN 'high'
    
    -- Medium attention: Early-stage students with prospects
    WHEN months_without_placement < 3 
      OR NEW.performance_rating = 'outstanding'
      THEN 'medium'
    
    -- Low attention: All other cases
    ELSE 'low'
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;