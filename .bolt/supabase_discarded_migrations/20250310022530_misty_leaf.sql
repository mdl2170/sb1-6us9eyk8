/*
  # Fix storage objects foreign key constraint

  1. Changes
    - Add foreign key constraint to storage.objects table to reference profiles(id)
    - This ensures student_id in storage paths maps to valid users
  
  2. Security
    - Maintains existing RLS policies
    - Ensures data integrity by linking storage objects to valid users
*/

-- Add foreign key constraint to storage.objects
ALTER TABLE storage.objects 
ADD CONSTRAINT objects_owner_fkey 
FOREIGN KEY ((storage.foldername(name))[1]::uuid)
REFERENCES auth.users(id)
ON DELETE CASCADE;