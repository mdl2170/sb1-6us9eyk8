/*
  # Add Additional Student Fields

  1. Changes
    - Add new columns to students table for additional student information
    - Add indexes for commonly queried fields
    - Update RLS policies to include new fields

  2. New Fields
    - program_start_date: When student starts the program
    - expected_end_date: Expected program completion date
    - actual_end_date: Actual program completion date
    - program_type: Type of program enrolled in
    - school: Current/Previous school name
    - school_graduation_date: School graduation date
    - linkedin_url: LinkedIn profile URL
    - major: Field of study
    - timezone: Student's timezone
    - student_folder_url: URL to student's document folder
    - parent_name: Parent/Guardian name
    - parent_phone: Parent/Guardian phone
    - parent_email: Parent/Guardian email
*/

-- Add new columns to students table
ALTER TABLE students
ADD COLUMN program_start_date date,
ADD COLUMN expected_end_date date,
ADD COLUMN actual_end_date date,
ADD COLUMN program_type text,
ADD COLUMN school text,
ADD COLUMN school_graduation_date date,
ADD COLUMN linkedin_url text,
ADD COLUMN major text,
ADD COLUMN timezone text,
ADD COLUMN student_folder_url text,
ADD COLUMN parent_name text,
ADD COLUMN parent_phone text,
ADD COLUMN parent_email text;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_students_program_type ON students(program_type);
CREATE INDEX IF NOT EXISTS idx_students_program_dates ON students(program_start_date, expected_end_date);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school);

-- Update RLS policies to include new fields
CREATE POLICY "Students can update their own extended profile"
  ON students FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);