/*
  # Add tasks and groups tables

  1. New Tables
    - `task_groups`
      - `id` (uuid, primary key)
      - `title` (text)
      - `color` (text)
      - `order` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, references profiles)
    
    - `tasks`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `status` (text)
      - `priority` (text)
      - `group_id` (uuid, references task_groups)
      - `assignee` (text)
      - `due_date` (timestamp)
      - `tags` (text[])
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, references profiles)

    - `task_resources`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references tasks)
      - `name` (text)
      - `type` (text)
      - `url` (text)
      - `size` (bigint)
      - `uploaded_at` (timestamp)
      - `uploaded_by` (uuid, references profiles)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create task_groups table
CREATE TABLE task_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  color text NOT NULL,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Create tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL,
  priority text NOT NULL,
  group_id uuid REFERENCES task_groups(id),
  assignee text,
  due_date timestamptz,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Create task_resources table
CREATE TABLE task_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id),
  name text NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  size bigint,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_resources ENABLE ROW LEVEL SECURITY;

-- Task groups policies
CREATE POLICY "Task groups are viewable by authenticated users"
  ON task_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create task groups"
  ON task_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update task groups"
  ON task_groups FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete task groups"
  ON task_groups FOR DELETE
  TO authenticated
  USING (true);

-- Tasks policies
CREATE POLICY "Tasks are viewable by authenticated users"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (true);

-- Task resources policies
CREATE POLICY "Task resources are viewable by authenticated users"
  ON task_resources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create task resources"
  ON task_resources FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update task resources"
  ON task_resources FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete task resources"
  ON task_resources FOR DELETE
  TO authenticated
  USING (true);