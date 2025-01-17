/*
  # Add task order column

  1. Changes
    - Add `order` column to tasks table
    - Initialize order based on creation date
    - Add index for better performance when ordering

  2. Notes
    - Orders are initialized based on creation timestamp to maintain existing order
    - Index added to optimize ORDER BY queries
*/

-- Add order column with a default value
ALTER TABLE tasks
ADD COLUMN "order" integer;

-- Create a function to initialize order values
CREATE OR REPLACE FUNCTION initialize_task_orders()
RETURNS void AS $$
DECLARE
  task_record record;
  current_order integer := 0;
BEGIN
  -- Initialize main tasks first
  FOR task_record IN 
    SELECT id 
    FROM tasks 
    WHERE parent_id IS NULL 
    ORDER BY created_at ASC
  LOOP
    UPDATE tasks 
    SET "order" = current_order 
    WHERE id = task_record.id;
    
    current_order := current_order + 1;
  END LOOP;

  -- Then initialize subtasks
  current_order := 0;
  FOR task_record IN 
    SELECT id 
    FROM tasks 
    WHERE parent_id IS NOT NULL 
    ORDER BY created_at ASC
  LOOP
    UPDATE tasks 
    SET "order" = current_order 
    WHERE id = task_record.id;
    
    current_order := current_order + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the initialization
SELECT initialize_task_orders();

-- Drop the temporary function
DROP FUNCTION initialize_task_orders();

-- Create index for better performance
CREATE INDEX idx_tasks_order ON tasks("order");

-- Set default value for new tasks
ALTER TABLE tasks
ALTER COLUMN "order" SET DEFAULT 0;