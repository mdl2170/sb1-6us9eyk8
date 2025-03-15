/*
  # Drop all resume-related database objects
  
  1. Changes
    - Drop all tables, functions, triggers related to resume uploads
    - Drop storage policies
    - Remove storage bucket
    - Clean slate for resume functionality
*/

-- Drop triggers first
DROP TRIGGER IF EXISTS on_resume_upload ON storage.objects;

-- Drop functions
DROP FUNCTION IF EXISTS handle_resume_upload();
DROP FUNCTION IF EXISTS get_next_resume_version(uuid);

-- Drop resume versions table and related objects
DROP TABLE IF EXISTS resume_versions CASCADE;
DROP INDEX IF EXISTS idx_resume_versions_student_id;
DROP INDEX IF EXISTS idx_resume_versions_status;

-- Drop storage bucket policies
DO $$ 
BEGIN
  -- Drop policies one by one, ignoring errors if they don't exist
  BEGIN
    DROP POLICY IF EXISTS "Students can upload own resumes" ON storage.objects;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Students can update own resumes" ON storage.objects;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Students can delete own resumes" ON storage.objects;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Students can view own resumes" ON storage.objects;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;

  BEGIN
    DROP POLICY IF EXISTS "Students can view own resumes and staff can view all" ON storage.objects;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- Delete resumes bucket
DELETE FROM storage.buckets WHERE id = 'resumes';