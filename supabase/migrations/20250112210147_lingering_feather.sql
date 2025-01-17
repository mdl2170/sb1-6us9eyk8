/*
  # Add subtasks support

  1. Changes
    - Add subtasks JSONB column to tasks table
    - Add index for subtasks querying
  
  2. Security
    - Update RLS policies to handle subtasks
*/

-- Add subtasks column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;

-- Add index for subtasks querying
CREATE INDEX IF NOT EXISTS idx_tasks_subtasks ON tasks USING GIN (subtasks);

-- Update RLS policies to handle subtasks
DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON tasks;
CREATE POLICY "Tasks are viewable by authenticated users"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update tasks" ON tasks;
CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true);