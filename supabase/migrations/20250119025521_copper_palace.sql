/*
  # Add user ownership to task groups

  1. Changes
    - Add owner_id column to task_groups table
    - Add foreign key constraint to profiles table
    - Update RLS policies for task groups
    - Add index for owner_id lookups

  2. Security
    - Enable RLS policies for task group ownership
    - Allow users to manage their own task groups
    - Allow staff to manage all task groups
*/

-- Add owner_id column to task_groups
ALTER TABLE task_groups
ADD COLUMN owner_id uuid REFERENCES profiles(id);

-- Create index for owner_id lookups
CREATE INDEX idx_task_groups_owner_id ON task_groups(owner_id);

-- Drop existing task group policies
DROP POLICY IF EXISTS "Task groups are viewable by authenticated users" ON task_groups;
DROP POLICY IF EXISTS "Authenticated users can create task groups" ON task_groups;
DROP POLICY IF EXISTS "Authenticated users can update task groups" ON task_groups;
DROP POLICY IF EXISTS "Authenticated users can delete task groups" ON task_groups;

-- Create new policies
CREATE POLICY "Users can view own task groups and staff can view all"
  ON task_groups FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'mentor')
    )
  );

CREATE POLICY "Users can create own task groups and staff can create for any user"
  ON task_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'mentor')
    )
  );

CREATE POLICY "Users can update own task groups and staff can update any"
  ON task_groups FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'mentor')
    )
  )
  WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'mentor')
    )
  );

CREATE POLICY "Users can delete own task groups and staff can delete any"
  ON task_groups FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'coach', 'mentor')
    )
  );

-- Update existing task groups to set owner_id
UPDATE task_groups
SET owner_id = created_by
WHERE owner_id IS NULL;