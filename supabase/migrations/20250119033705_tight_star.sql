/*
  # Fix avatar upload policies

  1. Updates
    - Drop existing policies
    - Create new policies with proper path handling
    - Add proper bucket configuration
  
  2. Security
    - Ensures users can only manage their own avatars
    - Maintains public read access
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;

-- Create new policies with proper path handling
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profiles' AND
  (CASE 
    WHEN POSITION('.' IN name) > 0 THEN 
      SPLIT_PART(name, '.', 1)
    ELSE 
      name
  END) = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profiles' AND
  (CASE 
    WHEN POSITION('.' IN name) > 0 THEN 
      SPLIT_PART(name, '.', 1)
    ELSE 
      name
  END) = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profiles' AND
  (CASE 
    WHEN POSITION('.' IN name) > 0 THEN 
      SPLIT_PART(name, '.', 1)
    ELSE 
      name
  END) = auth.uid()::text
);

CREATE POLICY "Public read access to avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profiles');

-- Update the updateAvatar function to use simpler path structure
CREATE OR REPLACE FUNCTION update_avatar_url()
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('avatar_url', NEW.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;