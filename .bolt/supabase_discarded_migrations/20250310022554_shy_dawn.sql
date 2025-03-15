/*
  # Resume Storage and Version Tracking Setup

  1. Storage
    - Creates resumes bucket for storing resume files
    - Enables RLS on storage.objects
    - Creates policies for student access control
  
  2. Functions
    - Creates function to get next resume version number
    - Creates trigger to handle resume uploads
    
  3. Security
    - Ensures students can only access their own resumes
    - Allows staff to view all resumes
*/

-- Create the resumes bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can upload own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Students can update own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Students can view own resumes and staff can view all" ON storage.objects;

-- Drop existing function and trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_resume_upload ON storage.objects;
DROP FUNCTION IF EXISTS handle_resume_upload();
DROP FUNCTION IF EXISTS get_next_version_number(uuid);

-- Function to get next version number
CREATE OR REPLACE FUNCTION get_next_version_number(p_student_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_version integer;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM resume_versions
    WHERE student_id = p_student_id;
    
    RETURN next_version;
END;
$$;

-- Function to handle resume uploads
CREATE OR REPLACE FUNCTION handle_resume_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    student_id_val uuid;
    version_number integer;
BEGIN
    -- Only handle resumes bucket
    IF NEW.bucket_id = 'resumes' THEN
        -- Extract student ID from path (first segment)
        student_id_val := split_part(NEW.name, '/', 1)::uuid;
        
        -- Get next version number
        version_number := get_next_version_number(student_id_val);
        
        -- Create resume version record
        INSERT INTO resume_versions (
            student_id,
            version_number,
            file_url,
            status,
            created_at,
            updated_at
        ) VALUES (
            student_id_val,
            version_number,
            storage.download_url(NEW.bucket_id, NEW.name),
            'draft',
            NOW(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger on storage.objects
CREATE TRIGGER on_resume_upload
    AFTER INSERT ON storage.objects
    FOR EACH ROW
    EXECUTE FUNCTION handle_resume_upload();

-- Create new policies for the resumes bucket
CREATE POLICY "Students can upload own resumes" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'resumes' AND
        (auth.uid()::text = split_part(name, '/', 1))
    );

CREATE POLICY "Students can update own resumes" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'resumes' AND
        (auth.uid()::text = split_part(name, '/', 1))
    );

CREATE POLICY "Students can delete own resumes" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'resumes' AND
        (auth.uid()::text = split_part(name, '/', 1))
    );

CREATE POLICY "Students can view own resumes and staff can view all" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'resumes' AND
        (
            -- Students can view their own resumes
            auth.uid()::text = split_part(name, '/', 1)
            OR
            -- Staff can view all resumes
            EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid()
                AND role IN ('admin', 'coach', 'mentor')
            )
        )
    );