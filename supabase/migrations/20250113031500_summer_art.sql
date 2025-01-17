/*
  # Update task ordering system
  
  1. Changes
    - Updates existing tasks with proper order values within their groups
    - Ensures subtasks have proper order values within their parent tasks
    - Creates functions to maintain order values
  
  2. Updates
    - Reorders all existing tasks based on their creation date
    - Maintains separate order sequences for each group and parent task
*/

-- Function to update task orders within groups
CREATE OR REPLACE FUNCTION update_task_orders_within_groups()
RETURNS void AS $$
DECLARE
  group_record record;
  task_record record;
  current_order integer;
BEGIN
  -- Process each group
  FOR group_record IN SELECT DISTINCT group_id FROM tasks WHERE parent_id IS NULL
  LOOP
    current_order := 0;
    
    -- Update main tasks in this group
    FOR task_record IN 
      SELECT id 
      FROM tasks 
      WHERE group_id = group_record.group_id 
      AND parent_id IS NULL 
      ORDER BY created_at ASC
    LOOP
      UPDATE tasks 
      SET "order" = current_order 
      WHERE id = task_record.id;
      
      current_order := current_order + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update subtask orders within their parent tasks
CREATE OR REPLACE FUNCTION update_subtask_orders()
RETURNS void AS $$
DECLARE
  parent_record record;
  subtask_record record;
  current_order integer;
BEGIN
  -- Process each parent task
  FOR parent_record IN SELECT id FROM tasks WHERE parent_id IS NULL
  LOOP
    current_order := 0;
    
    -- Update subtasks for this parent
    FOR subtask_record IN 
      SELECT id 
      FROM tasks 
      WHERE parent_id = parent_record.id 
      ORDER BY created_at ASC
    LOOP
      UPDATE tasks 
      SET "order" = current_order 
      WHERE id = subtask_record.id;
      
      current_order := current_order + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the updates
SELECT update_task_orders_within_groups();
SELECT update_subtask_orders();

-- Drop the temporary functions
DROP FUNCTION update_task_orders_within_groups();
DROP FUNCTION update_subtask_orders();

-- Create trigger function to maintain order on insert
CREATE OR REPLACE FUNCTION maintain_task_order()
RETURNS TRIGGER AS $$
DECLARE
  max_order integer;
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- Get max order for main tasks in the group
    SELECT COALESCE(MAX("order"), -1) INTO max_order
    FROM tasks
    WHERE group_id = NEW.group_id
    AND parent_id IS NULL;
  ELSE
    -- Get max order for subtasks of the parent
    SELECT COALESCE(MAX("order"), -1) INTO max_order
    FROM tasks
    WHERE parent_id = NEW.parent_id;
  END IF;
  
  NEW."order" := max_order + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new tasks
CREATE TRIGGER set_task_order
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION maintain_task_order();