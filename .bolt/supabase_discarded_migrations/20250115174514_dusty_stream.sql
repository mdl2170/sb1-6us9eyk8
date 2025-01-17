/*
  # Add student contact fields

  1. New Fields
    - facebook_url: Student's Facebook profile URL
    - phone: Student's contact phone number

  2. Changes
    - Add new columns to students table
    - Add indexes for efficient querying
    - Add comments for documentation
*/

-- Add new columns to students table
ALTER TABLE students
ADD COLUMN facebook_url text,
ADD COLUMN phone text;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);

-- Add column comments
COMMENT ON COLUMN students.facebook_url IS 'Student''s Facebook profile URL';
COMMENT ON COLUMN students.phone IS 'Student''s contact phone number';