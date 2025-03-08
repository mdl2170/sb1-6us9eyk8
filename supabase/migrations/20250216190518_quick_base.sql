-- Update check constraints for performance indicators
ALTER TABLE performance_reviews
DROP CONSTRAINT IF EXISTS performance_reviews_resume_quality_check,
DROP CONSTRAINT IF EXISTS performance_reviews_application_effectiveness_check,
DROP CONSTRAINT IF EXISTS performance_reviews_behavioral_performance_check,
DROP CONSTRAINT IF EXISTS performance_reviews_networking_capability_check,
DROP CONSTRAINT IF EXISTS performance_reviews_technical_proficiency_check,
DROP CONSTRAINT IF EXISTS performance_reviews_energy_level_check;

ALTER TABLE performance_reviews
ADD CONSTRAINT performance_reviews_resume_quality_check 
  CHECK (resume_quality BETWEEN 0 AND 5),
ADD CONSTRAINT performance_reviews_application_effectiveness_check 
  CHECK (application_effectiveness BETWEEN 0 AND 5),
ADD CONSTRAINT performance_reviews_behavioral_performance_check 
  CHECK (behavioral_performance BETWEEN 0 AND 5),
ADD CONSTRAINT performance_reviews_networking_capability_check 
  CHECK (networking_capability BETWEEN 0 AND 5),
ADD CONSTRAINT performance_reviews_technical_proficiency_check 
  CHECK (technical_proficiency BETWEEN 0 AND 5),
ADD CONSTRAINT performance_reviews_energy_level_check 
  CHECK (energy_level BETWEEN 0 AND 5);

-- Convert existing values from 10-point to 5-point scale
UPDATE performance_reviews
SET
  resume_quality = CASE 
    WHEN resume_quality IS NOT NULL THEN GREATEST(1, LEAST(5, ROUND(resume_quality::numeric / 2)))
    ELSE NULL
  END,
  application_effectiveness = CASE 
    WHEN application_effectiveness IS NOT NULL THEN GREATEST(1, LEAST(5, ROUND(application_effectiveness::numeric / 2)))
    ELSE NULL
  END,
  behavioral_performance = CASE 
    WHEN behavioral_performance IS NOT NULL THEN GREATEST(1, LEAST(5, ROUND(behavioral_performance::numeric / 2)))
    ELSE NULL
  END,
  networking_capability = CASE 
    WHEN networking_capability IS NOT NULL THEN GREATEST(1, LEAST(5, ROUND(networking_capability::numeric / 2)))
    ELSE NULL
  END,
  technical_proficiency = CASE 
    WHEN technical_proficiency IS NOT NULL THEN GREATEST(1, LEAST(5, ROUND(technical_proficiency::numeric / 2)))
    ELSE NULL
  END,
  energy_level = CASE 
    WHEN energy_level IS NOT NULL THEN GREATEST(1, LEAST(5, ROUND(energy_level::numeric / 2)))
    ELSE NULL
  END;