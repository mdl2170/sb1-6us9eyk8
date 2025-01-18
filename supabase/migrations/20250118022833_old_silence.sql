/*
  # Add task updates feature
  
  1. New Tables
    - `task_updates`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references tasks)
      - `content` (text)
      - `mentions` (text array)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `task_updates` table
    - Add policies for authenticated users
*/

-- Create task_updates table
CREATE TABLE task_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  content text NOT NULL,
  mentions text[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_task_updates_task_id ON task_updates(task_id);
CREATE INDEX idx_task_updates_created_by ON task_updates(created_by);
CREATE INDEX idx_task_updates_created_at ON task_updates(created_at);

-- Enable RLS
ALTER TABLE task_updates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Task updates are viewable by authenticated users"
ON task_updates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create task updates"
ON task_updates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own task updates"
ON task_updates FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own task updates"
ON task_updates FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Function to notify mentioned users
CREATE OR REPLACE FUNCTION notify_task_update_mentions()
RETURNS trigger AS $$
BEGIN
  IF NEW.mentions IS NOT NULL AND array_length(NEW.mentions, 1) > 0 THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      link
    )
    SELECT
      p.id,
      'Task Update Mention',
      format(
        '%s mentioned you in a task update: %s',
        (SELECT full_name FROM profiles WHERE id = NEW.created_by),
        substring(NEW.content from 1 for 100) || CASE WHEN length(NEW.content) > 100 THEN '...' ELSE '' END
      ),
      'mention',
      '/progress?task=' || NEW.task_id
    FROM
      unnest(NEW.mentions) AS mention
      JOIN profiles p ON p.full_name = mention;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for mentions
CREATE TRIGGER on_task_update_mention
  AFTER INSERT ON task_updates
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_update_mentions();