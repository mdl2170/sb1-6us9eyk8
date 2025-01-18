/*
  # Email Sending Functions

  1. New Features
    - Add function to send emails via Google SMTP
    - Add template processing function
    - Add email queue management
*/

-- Create email queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  retry_count integer DEFAULT 0,
  next_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Enable RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can view email queue"
  ON email_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to process email template
CREATE OR REPLACE FUNCTION process_email_template(
  template_name text,
  template_vars jsonb
)
RETURNS record
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_record record;
  processed_subject text;
  processed_body text;
  var_name text;
  var_value text;
BEGIN
  -- Get template
  SELECT * INTO template_record
  FROM email_templates
  WHERE name = template_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email template "%" not found', template_name;
  END IF;

  -- Process subject and body
  processed_subject := template_record.subject;
  processed_body := template_record.body;

  -- Replace variables
  FOR var_name, var_value IN SELECT * FROM jsonb_each_text(template_vars)
  LOOP
    processed_subject := replace(processed_subject, '{{' || var_name || '}}', var_value);
    processed_body := replace(processed_body, '{{' || var_name || '}}', var_value);
  END LOOP;

  RETURN ROW(processed_subject, processed_body);
END;
$$;

-- Function to queue email
CREATE OR REPLACE FUNCTION queue_email(
  to_email text,
  template_name text,
  template_vars jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  processed_email record;
  queue_id uuid;
BEGIN
  -- Process template
  SELECT * INTO processed_email
  FROM process_email_template(template_name, template_vars);

  -- Queue email
  INSERT INTO email_queue (to_email, subject, body)
  VALUES (to_email, processed_email.subject, processed_email.body)
  RETURNING id INTO queue_id;

  RETURN queue_id;
END;
$$;

-- Function to send task reminder
CREATE OR REPLACE FUNCTION send_task_reminder(
  task_id uuid,
  reminder_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record record;
  assignee_profile record;
  template_name text;
  template_vars jsonb;
BEGIN
  -- Get task and assignee details
  SELECT t.*, p.email, p.full_name
  INTO task_record
  FROM tasks t
  JOIN profiles p ON p.full_name = t.assignee
  WHERE t.id = task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task or assignee not found';
  END IF;

  -- Set template name based on reminder type
  template_name := CASE
    WHEN reminder_type = 'due_date' THEN 'task_due_reminder'
    WHEN reminder_type = 'two_days_before' THEN 'task_upcoming_reminder'
  END;

  -- Prepare template variables
  template_vars := jsonb_build_object(
    'task_title', task_record.title,
    'assignee_name', task_record.full_name,
    'task_description', COALESCE(task_record.description, ''),
    'due_date', to_char(task_record.due_date::date, 'Month DD, YYYY'),
    'task_url', format('%s/progress?task=%s', current_setting('app.domain'), task_id)
  );

  -- Queue email
  PERFORM queue_email(task_record.email, template_name, template_vars);
END;
$$;