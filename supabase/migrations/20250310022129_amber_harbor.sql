/*
  # Fix Resume Storage Policies

  1. Storage Setup
    - Create resumes bucket if not exists
    - Enable RLS on storage.objects
    - Drop existing policies to avoid conflicts
    - Create new storage policies for resume access

  2. Functions
    - Create helper functions for storage path handling
    - Create function to get next resume version
    - Add trigger for automatic version creation
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

-- Function to get next version number
CREATE OR REPLACE FUNCTION get_next_resume_version(student_id uuid)
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
    WHERE student_id = $1;
    
    RETURN next_version;
END;
$$;

-- Function to handle resume uploads
CREATE OR REPLACE FUNCTION handle_resume_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only handle resumes bucket
    IF NEW.bucket_id = 'resumes' THEN
        -- Extract student ID from path (first segment)
        DECLARE
            student_id uuid;
            version_number integer;
        BEGIN
            -- Get student ID from the first path segment
            student_id := split_part(NEW.name, '/', 1)::uuid;
            
            -- Get next version number
            version_number := get_next_resume_version(student_id);
            
            -- Create resume version record
            INSERT INTO resume_versions (
                student_id,
                version_number,
                file_url,
                status,
                created_at,
                updated_at
            ) VALUES (
                student_id,
                version_number,
                storage.download_url(NEW.bucket_id, NEW.name),
                'draft',
                NOW(),
                NOW()
            );
        END;
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger on storage.objects
DROP TRIGGER IF EXISTS on_resume_upload ON storage.objects;
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