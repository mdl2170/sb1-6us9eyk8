/*
  # Task Reminder System

  1. New Tables
    - `task_reminders`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references tasks)
      - `reminder_type` (text - 'due_date' or 'two_days_before')
      - `scheduled_for` (timestamptz)
      - `sent_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Functions
    - Function to schedule reminders for a task
    - Function to process due reminders
*/

-- Create task_reminders table
CREATE TABLE task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('due_date', 'two_days_before')),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster reminder processing
CREATE INDEX idx_task_reminders_scheduled
ON task_reminders(scheduled_for)
WHERE sent_at IS NULL;

-- Enable RLS
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Task reminders are viewable by authenticated users"
ON task_reminders FOR SELECT
TO authenticated
USING (true);

-- Function to schedule reminders for a task
CREATE OR REPLACE FUNCTION schedule_task_reminders(
  task_id uuid,
  due_date timestamptz,
  assignee text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only schedule reminders if there's a due date and assignee
  IF due_date IS NOT NULL AND assignee IS NOT NULL THEN
    -- Schedule two days before reminder
    INSERT INTO task_reminders (
      task_id,
      reminder_type,
      scheduled_for
    ) VALUES (
      task_id,
      'two_days_before',
      due_date - interval '2 days'
    );

    -- Schedule due date reminder
    INSERT INTO task_reminders (
      task_id,
      reminder_type,
      scheduled_for
    ) VALUES (
      task_id,
      'due_date',
      due_date
    );
  END IF;
END;
$$;