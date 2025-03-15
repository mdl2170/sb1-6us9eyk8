/*
  # Student Performance Review System

  1. New Tables
    - performance_reviews
      - Monthly reviews with overall ratings and assessments
    - performance_indicators
      - Individual performance metrics and sub-indicators
    - office_hours
      - Records of coaching/mentoring sessions
    - mock_interviews
      - Technical and behavioral interview assessments
    - resume_versions
      - Resume tracking and version history

  2. Security
    - Enable RLS on all tables
    - Role-based access policies for coaches, mentors, and admins
    - Student access limited to own records

  3. Changes
    - Add attention_level to students table
    - Add performance tracking fields
*/

-- Create enum for attention levels
CREATE TYPE attention_level AS ENUM ('level_1', 'level_2', 'level_3', 'level_4');

-- Create enum for performance ratings
CREATE TYPE performance_rating AS ENUM ('outstanding', 'medium', 'red_flag');

-- Add performance tracking fields to students table
ALTER TABLE students 
ADD COLUMN attention_level attention_level,
ADD COLUMN performance_rating performance_rating,
ADD COLUMN last_review_date date;

-- Performance Reviews table
CREATE TABLE performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  review_date date NOT NULL,
  attention_level attention_level NOT NULL,
  performance_rating performance_rating NOT NULL,
  overall_notes text,
  coach_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance Indicators table
CREATE TABLE performance_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES performance_reviews(id) ON DELETE CASCADE,
  resume_quality integer CHECK (resume_quality BETWEEN 0 AND 10),
  application_effectiveness integer CHECK (application_effectiveness BETWEEN 0 AND 10),
  behavioral_performance integer CHECK (behavioral_performance BETWEEN 0 AND 10),
  networking_capability integer CHECK (networking_capability BETWEEN 0 AND 10),
  technical_proficiency integer CHECK (technical_proficiency BETWEEN 0 AND 10),
  energy_level integer CHECK (energy_level BETWEEN 0 AND 10),
  notes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Office Hours Records table
CREATE TABLE office_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES profiles(id),
  session_date timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  recording_url text,
  meeting_notes text,
  topics_covered text[],
  action_items text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mock Interviews table
CREATE TABLE mock_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  interviewer_id uuid REFERENCES profiles(id),
  interview_date timestamptz NOT NULL,
  interview_type text NOT NULL CHECK (interview_type IN ('technical', 'behavioral')),
  recording_url text,
  overall_rating integer CHECK (overall_rating BETWEEN 0 AND 10),
  strengths text[],
  areas_for_improvement text[],
  evaluation_notes text,
  worksheet_completion_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Resume Versions table
CREATE TABLE resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  file_url text NOT NULL,
  feedback text,
  reviewed_by uuid REFERENCES profiles(id),
  status text CHECK (status IN ('draft', 'under_review', 'approved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for performance_reviews
CREATE POLICY "Students can view own performance reviews"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    coach_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = performance_reviews.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Coaches and admins can create performance reviews"
  ON performance_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_id
      AND (s.coach_id = auth.uid() OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
      ))
    )
  );

-- Create policies for performance_indicators
CREATE POLICY "Students can view own performance indicators"
  ON performance_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM performance_reviews pr
      WHERE pr.id = review_id
      AND (
        pr.student_id = auth.uid() OR
        pr.coach_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM students s
          WHERE s.id = pr.student_id
          AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
        ) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  );

-- Create policies for office_hours
CREATE POLICY "Students can view own office hours"
  ON office_hours FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    coach_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = office_hours.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create policies for mock_interviews
CREATE POLICY "Students can view own mock interviews"
  ON mock_interviews FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    interviewer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = mock_interviews.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create policies for resume_versions
CREATE POLICY "Students can view own resume versions"
  ON resume_versions FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    reviewed_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = resume_versions.student_id
      AND (s.coach_id = auth.uid() OR s.mentor_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_performance_reviews_student_id ON performance_reviews(student_id);
CREATE INDEX idx_performance_reviews_coach_id ON performance_reviews(coach_id);
CREATE INDEX idx_performance_reviews_date ON performance_reviews(review_date);
CREATE INDEX idx_office_hours_student_id ON office_hours(student_id);
CREATE INDEX idx_office_hours_coach_id ON office_hours(coach_id);
CREATE INDEX idx_mock_interviews_student_id ON mock_interviews(student_id);
CREATE INDEX idx_mock_interviews_date ON mock_interviews(interview_date);
CREATE INDEX idx_resume_versions_student_id ON resume_versions(student_id);

-- Function to calculate weighted performance score
CREATE OR REPLACE FUNCTION calculate_performance_score(indicator_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  indicators record;
BEGIN
  SELECT * INTO indicators
  FROM performance_indicators
  WHERE id = indicator_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN (
    (COALESCE(indicators.resume_quality, 0) * 0.10) +
    (COALESCE(indicators.application_effectiveness, 0) * 0.10) +
    (COALESCE(indicators.behavioral_performance, 0) * 0.10) +
    (COALESCE(indicators.networking_capability, 0) * 0.20) +
    (COALESCE(indicators.technical_proficiency, 0) * 0.30) +
    (COALESCE(indicators.energy_level, 0) * 0.20)
  );
END;
$$;

-- Function to update student attention level based on criteria
CREATE OR REPLACE FUNCTION update_student_attention_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    -- Level 1 (Highest): Senior/Master students, 6+ months without placement
    WHEN months_without_placement >= 6 AND student_record.program_type IN ('senior', 'master')
      THEN 'level_1'
    
    -- Level 2 (High): Multiple qualifying conditions
    WHEN (months_without_placement >= 4 AND student_record.program_type = 'senior')
      OR (months_without_placement >= 3 AND NEW.performance_rating = 'red_flag')
      THEN 'level_2'
    
    -- Level 3 (Medium): Early-stage students with prospects
    WHEN months_without_placement < 3 
      OR NEW.performance_rating = 'medium'
      THEN 'level_3'
    
    -- Level 4 (Low): All other cases
    ELSE 'level_4'
  END;

  RETURN NEW;
END;
$$;

-- Create trigger for attention level updates
CREATE TRIGGER update_attention_level
  BEFORE INSERT OR UPDATE ON performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_student_attention_level();