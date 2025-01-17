/*
  # Update task ordering system
  
  1. Changes
    - Modify order column to bigint to handle larger numbers
    - Drop existing trigger
    - Create new trigger for task ordering based on group order
    - Recalculate existing task orders
  
  2. New Ordering System
    - Task order = group_order * 10000 + task_order_within_group
    - Ensures tasks stay within their groups
    - Maintains proper ordering when moving tasks
*/

-- Change order column to bigint
ALTER TABLE tasks
ALTER COLUMN "order" TYPE bigint;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS set_task_order ON tasks;
DROP FUNCTION IF EXISTS maintain_task_order();

-- Create new trigger function with updated ordering logic
CREATE OR REPLACE FUNCTION maintain_task_order()
RETURNS TRIGGER AS $$
DECLARE
  group_order integer;
  max_task_order bigint;
BEGIN
  -- Get the group's order
  SELECT "order" INTO group_order
  FROM task_groups
  WHERE id = NEW.group_id;

  IF NEW.parent_id IS NULL THEN
    -- Get max order for main tasks in the group
    SELECT COALESCE(MAX("order") % 10000, 0) INTO max_task_order
    FROM tasks
    WHERE group_id = NEW.group_id
    AND parent_id IS NULL;
    
    -- Calculate new order: group_order * 10000 + (max_task_order + 1)
    NEW."order" := (group_order * 10000) + (max_task_order + 1);
  ELSE
    -- Get max order for subtasks of the parent
    SELECT COALESCE(MAX("order") % 10000, 0) INTO max_task_order
    FROM tasks
    WHERE parent_id = NEW.parent_id;
    
    -- For subtasks, use the same group base but increment the task order
    NEW."order" := (group_order * 10000) + (max_task_order + 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER set_task_order
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION maintain_task_order();

-- Function to recalculate existing task orders
CREATE OR REPLACE FUNCTION recalculate_task_orders()
RETURNS void AS $$
DECLARE
  group_record record;
  task_record record;
  subtask_record record;
  current_order integer;
BEGIN
  -- Process each group
  FOR group_record IN 
    SELECT id, "order" 
    FROM task_groups 
    ORDER BY "order"
  LOOP
    current_order := 1;
    
    -- Update main tasks in this group
    FOR task_record IN 
      SELECT id 
      FROM tasks 
      WHERE group_id = group_record.id 
      AND parent_id IS NULL 
      ORDER BY "order"
    LOOP
      -- Set new order: group_order * 10000 + current_order
      UPDATE tasks 
      SET "order" = (group_record."order" * 10000) + current_order 
      WHERE id = task_record.id;
      
      -- Process subtasks
      FOR subtask_record IN 
        SELECT id 
        FROM tasks 
        WHERE parent_id = task_record.id 
        ORDER BY "order"
      LOOP
        UPDATE tasks 
        SET "order" = (group_record."order" * 10000) + current_order 
        WHERE id = subtask_record.id;
        
        current_order := current_order + 1;
      END LOOP;
      
      current_order := current_order + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the recalculation
SELECT recalculate_task_orders();

-- Drop the temporary function
DROP FUNCTION recalculate_task_orders();