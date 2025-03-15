/*
  # Consolidate resume tables
  
  1. Changes
    - Drop redundant resume_uploads table
    - Keep resume_versions as the single source of truth
*/

-- Drop resume_uploads table and its dependencies
DROP TABLE IF EXISTS resume_uploads CASCADE;
DROP INDEX IF EXISTS idx_resume_uploads_student_id;
DROP INDEX IF EXISTS idx_resume_uploads_status;