/*
  # Add task creation notification

  1. New Features
    - Add email template for task creation
    - Add trigger for task creation notifications
  
  2. Changes
    - Add new email template
    - Create notification trigger function
    - Create trigger for task creation
*/

-- Create email template for task creation
INSERT INTO email_templates (name, subject, body, variables)
VALUES (
  'task_creation',
  'New Task Assigned: {{task_title}}',
  '<!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">New Task Assigned</h2>
      <p>Hello {{assignee_name}},</p>
      <p>A new task has been assigned to you:</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin: 0; color: #1f2937;">{{task_title}}</h3>
        <p style="margin: 10px 0;">{{task_description}}</p>
        <div style="margin-top: 15px;">
          <p style="margin: 5px 0;"><strong>Priority:</strong> {{priority}}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> {{status}}</p>
          <p style="margin: 5px 0;"><strong>Due Date:</strong> {{due_date}}</p>
        </div>
        <p style="margin: 10px 0 0 0;"><strong>Created by:</strong> {{creator_name}}</p>
      </div>
      <a href="{{task_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Task</a>
    </div>
  </body>
  </html>',
  ARRAY['task_title', 'assignee_name', 'task_description', 'priority', 'status', 'due_date', 'creator_name', 'task_url']
);

-- Function to handle task creation notifications
CREATE OR REPLACE FUNCTION notify_task_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assignee_profile record;
  creator_name text;
  app_domain text;
  template_vars jsonb;
BEGIN
  -- Only proceed if task has an assignee
  IF NEW.assignee IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get app domain
  app_domain := get_config('app.domain');

  -- Get creator's name
  SELECT full_name INTO creator_name
  FROM profiles
  WHERE id = auth.uid();

  -- Get assignee details
  SELECT p.id, p.email, p.full_name 
  INTO assignee_profile
  FROM profiles p
  WHERE p.full_name = NEW.assignee;

  IF assignee_profile.id IS NOT NULL THEN
    template_vars := jsonb_build_object(
      'task_title', NEW.title,
      'assignee_name', assignee_profile.full_name,
      'task_description', COALESCE(NEW.description, ''),
      'priority', NEW.priority,
      'status', NEW.status,
      'due_date', COALESCE(to_char(NEW.due_date::timestamptz, 'YYYY-MM-DD'), 'Not set'),
      'creator_name', creator_name,
      'task_url', format('%s/progress?task=%s', app_domain, NEW.id)
    );

    -- Queue email notification
    PERFORM queue_email(
      assignee_profile.email,
      'task_creation',
      template_vars
    );

    -- Create in-app notification
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      link
    ) VALUES (
      assignee_profile.id,
      'New Task Assigned',
      format('You have been assigned a new task: %s', NEW.title),
      'task_assignment',
      format('/progress?task=%s', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for task creation
CREATE TRIGGER on_task_creation
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_creation();