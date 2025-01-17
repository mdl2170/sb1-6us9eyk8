/*
  # Add additional fields to mentor records

  1. New Fields
    - `linkedin_url`: LinkedIn profile URL
    - `bio`: Mentor's biography/description
    - `internal_note`: Internal notes about the mentor
    - `availability`: Mentor's availability schedule
    - `preferred_communication`: Preferred communication method
    - `languages`: Languages spoken
    - `industry_experience`: Years of industry experience
    - `company`: Current company
    - `position`: Current position
    - `skills`: Technical skills and areas of expertise
    - `mentoring_experience`: Previous mentoring experience description
    - `mentoring_style`: Description of mentoring approach/style
    - `expectations`: Expectations from mentees
    - `achievements`: Notable achievements and certifications
    - `website_url`: Personal/portfolio website URL
    - `github_url`: GitHub profile URL

  2. Indexes
    - Added indexes for commonly queried fields
*/

-- Add new columns to mentors table
ALTER TABLE mentors
ADD COLUMN linkedin_url text,
ADD COLUMN bio text,
ADD COLUMN internal_note text,
ADD COLUMN availability jsonb DEFAULT '[]'::jsonb,
ADD COLUMN preferred_communication text,
ADD COLUMN languages text[] DEFAULT '{}'::text[],
ADD COLUMN industry_experience integer,
ADD COLUMN company text,
ADD COLUMN position text,
ADD COLUMN skills text[] DEFAULT '{}'::text[],
ADD COLUMN mentoring_experience text,
ADD COLUMN mentoring_style text,
ADD COLUMN expectations text,
ADD COLUMN achievements text[] DEFAULT '{}'::text[],
ADD COLUMN website_url text,
ADD COLUMN github_url text;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_mentors_company ON mentors(company);
CREATE INDEX IF NOT EXISTS idx_mentors_industry_experience ON mentors(industry_experience);
CREATE INDEX IF NOT EXISTS idx_mentors_skills ON mentors USING gin(skills);
CREATE INDEX IF NOT EXISTS idx_mentors_languages ON mentors USING gin(languages);

-- Update mentor type in MentorProfile interface
COMMENT ON TABLE mentors IS 'Stores mentor profiles with extended professional and mentoring information';
COMMENT ON COLUMN mentors.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN mentors.bio IS 'Mentor''s biography and background';
COMMENT ON COLUMN mentors.internal_note IS 'Internal notes about the mentor (admin only)';
COMMENT ON COLUMN mentors.availability IS 'JSON array of availability slots';
COMMENT ON COLUMN mentors.preferred_communication IS 'Preferred method of communication';
COMMENT ON COLUMN mentors.languages IS 'Array of languages spoken';
COMMENT ON COLUMN mentors.industry_experience IS 'Years of industry experience';
COMMENT ON COLUMN mentors.company IS 'Current company';
COMMENT ON COLUMN mentors.position IS 'Current position';
COMMENT ON COLUMN mentors.skills IS 'Array of technical skills and expertise areas';
COMMENT ON COLUMN mentors.mentoring_experience IS 'Description of previous mentoring experience';
COMMENT ON COLUMN mentors.mentoring_style IS 'Description of mentoring approach and style';
COMMENT ON COLUMN mentors.expectations IS 'Expectations from mentees';
COMMENT ON COLUMN mentors.achievements IS 'Array of notable achievements and certifications';
COMMENT ON COLUMN mentors.website_url IS 'Personal/portfolio website URL';
COMMENT ON COLUMN mentors.github_url IS 'GitHub profile URL';