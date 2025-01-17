/*
  # Add storage policies for task resources

  1. Changes
    - Create storage policies for task-resources bucket
    - Allow authenticated users to upload files
    - Allow authenticated users to delete their files
    - Allow public read access for files
*/

-- Enable storage by creating the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-resources', 'task-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-resources');

-- Allow authenticated users to delete their files
CREATE POLICY "Allow authenticated users to delete their files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-resources');

-- Allow public read access
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'task-resources');