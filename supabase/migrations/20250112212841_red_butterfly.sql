/*
  # Add parent-child relationship for tasks

  1. Changes
    - Add parent_id column to tasks table
    - Add foreign key constraint to ensure referential integrity
    - Remove old subtasks JSONB column
    - Add index on parent_id for better query performance

  2. Security
    - Maintain existing RLS policies
*/

-- Add parent_id column
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES tasks(id);

-- Create index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- Remove old subtasks column
ALTER TABLE tasks DROP COLUMN IF EXISTS subtasks;

-- Update RLS policies to handle parent-child relationships
DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON tasks;
CREATE POLICY "Tasks are viewable by authenticated users"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tasks"
  ON tasks;
CREATE POLICY "Authenticated users can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update tasks"
  ON tasks;
CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete tasks"
  ON tasks;
CREATE POLICY "Authenticated users can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (true);