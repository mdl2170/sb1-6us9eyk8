/*
  # Combine Performance Indicators into Reviews Table

  1. Changes
    - Add performance indicator columns to performance_reviews table
    - Migrate existing data from performance_indicators to performance_reviews
    - Drop performance_indicators table

  2. Data Migration
    - Preserves all existing indicator data by copying to new columns
    - Maintains data integrity during migration
    - Handles NULL values appropriately

  3. Schema Updates
    - Adds all indicator metrics directly to reviews table
    - Adds JSON column for indicator notes
    - Removes separate indicators table
*/

-- Add indicator columns to performance_reviews
ALTER TABLE performance_reviews
ADD COLUMN resume_quality integer CHECK (resume_quality BETWEEN 0 AND 10),
ADD COLUMN application_effectiveness integer CHECK (application_effectiveness BETWEEN 0 AND 10),
ADD COLUMN behavioral_performance integer CHECK (behavioral_performance BETWEEN 0 AND 10),
ADD COLUMN networking_capability integer CHECK (networking_capability BETWEEN 0 AND 10),
ADD COLUMN technical_proficiency integer CHECK (technical_proficiency BETWEEN 0 AND 10),
ADD COLUMN energy_level integer CHECK (energy_level BETWEEN 0 AND 10),
ADD COLUMN indicator_notes jsonb DEFAULT '{}'::jsonb;

-- Migrate existing data
DO $$
DECLARE
  indicator record;
BEGIN
  FOR indicator IN
    SELECT * FROM performance_indicators
  LOOP
    UPDATE performance_reviews
    SET
      resume_quality = indicator.resume_quality,
      application_effectiveness = indicator.application_effectiveness,
      behavioral_performance = indicator.behavioral_performance,
      networking_capability = indicator.networking_capability,
      technical_proficiency = indicator.technical_proficiency,
      energy_level = indicator.energy_level,
      indicator_notes = indicator.notes
    WHERE id = indicator.review_id;
  END LOOP;
END $$;

-- Drop performance_indicators table
DROP TABLE performance_indicators;