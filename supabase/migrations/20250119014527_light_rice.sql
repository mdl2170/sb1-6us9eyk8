/*
  # Add task update notifications

  1. Changes
    - Add trigger to notify assignee when task is updated
    - Add email template for task field changes
    - Add function to handle task update notifications

  2. Security
    - Uses existing RLS policies
    - Maintains security context for notifications
*/

-- Create email template for task field changes
INSERT INTO email_templates (name, subject, body, variables)
VALUES (
  'task_field_update',
  'Task Updated: {{task_title}}',
  '<!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Task Updated</h2>
      <p>Hello {{assignee_name}},</p>
      <p>The following task has been updated:</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin: 0; color: #1f2937;">{{task_title}}</h3>
        <p style="margin: 10px 0;">{{task_description}}</p>
        <div style="margin-top: 15px;">
          <h4 style="margin: 0 0 10px 0;">Changes:</h4>
          {{changes_list}}
        </div>
        <p style="margin: 10px 0 0 0;"><strong>Updated by:</strong> {{updater_name}}</p>
      </div>
      <a href="{{task_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Task</a>
    </div>
  </body>
  </html>',
  ARRAY['task_title', 'assignee_name', 'task_description', 'changes_list', 'updater_name', 'task_url']
);

-- Function to generate changes list HTML
CREATE OR REPLACE FUNCTION generate_changes_list(
  old_record jsonb,
  new_record jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  changes text := '';
  field_name text;
  old_value text;
  new_value text;
BEGIN
  -- Check status change
  IF old_record->>'status' != new_record->>'status' THEN
    changes := changes || format(
      '<div style="margin-bottom: 5px;">• Status: %s → %s</div>',
      old_record->>'status',
      new_record->>'status'
    );
  END IF;

  -- Check priority change
  IF old_record->>'priority' != new_record->>'priority' THEN
    changes := changes || format(
      '<div style="margin-bottom: 5px;">• Priority: %s → %s</div>',
      old_record->>'priority',
      new_record->>'priority'
    );
  END IF;

  -- Check due date change
  IF old_record->>'due_date' != new_record->>'due_date' THEN
    changes := changes || format(
      '<div style="margin-bottom: 5px;">• Due Date: %s → %s</div>',
      COALESCE(to_char((old_record->>'due_date')::timestamptz, 'YYYY-MM-DD'), 'None'),
      COALESCE(to_char((new_record->>'due_date')::timestamptz, 'YYYY-MM-DD'), 'None')
    );
  END IF;

  -- Check assignee change
  IF old_record->>'assignee' != new_record->>'assignee' THEN
    changes := changes || format(
      '<div style="margin-bottom: 5px;">• Assignee: %s → %s</div>',
      COALESCE(old_record->>'assignee', 'Unassigned'),
      COALESCE(new_record->>'assignee', 'Unassigned')
    );
  END IF;

  -- Check description change
  IF old_record->>'description' != new_record->>'description' THEN
    changes := changes || '<div style="margin-bottom: 5px;">• Description was updated</div>';
  END IF;

  RETURN changes;
END;
$$;

-- Function to handle task update notifications
CREATE OR REPLACE FUNCTION notify_task_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assignee_profile record;
  updater_name text;
  changes_list text;
  template_vars jsonb;
BEGIN
  -- Only proceed if there are relevant changes
  IF (OLD.status = NEW.status AND 
      OLD.priority = NEW.priority AND 
      OLD.due_date = NEW.due_date AND 
      OLD.assignee = NEW.assignee AND 
      OLD.description = NEW.description) THEN
    RETURN NEW;
  END IF;

  -- Get updater's name
  SELECT full_name INTO updater_name
  FROM profiles
  WHERE id = auth.uid();

  -- Generate changes list
  changes_list := generate_changes_list(
    row_to_json(OLD)::jsonb,
    row_to_json(NEW)::jsonb
  );

  -- If assignee changed, notify both old and new assignee
  IF OLD.assignee IS DISTINCT FROM NEW.assignee THEN
    -- Notify old assignee if exists
    IF OLD.assignee IS NOT NULL THEN
      SELECT p.id, p.email, p.full_name 
      INTO assignee_profile
      FROM profiles p
      WHERE p.full_name = OLD.assignee;

      IF assignee_profile.id IS NOT NULL THEN
        template_vars := jsonb_build_object(
          'task_title', NEW.title,
          'assignee_name', assignee_profile.full_name,
          'task_description', COALESCE(NEW.description, ''),
          'changes_list', changes_list,
          'updater_name', updater_name,
          'task_url', format('%s/progress?task=%s', current_setting('app.domain'), NEW.id)
        );

        PERFORM queue_email(
          assignee_profile.email,
          'task_field_update',
          template_vars
        );
      END IF;
    END IF;
  END IF;

  -- Notify current/new assignee
  IF NEW.assignee IS NOT NULL THEN
    SELECT p.id, p.email, p.full_name 
    INTO assignee_profile
    FROM profiles p
    WHERE p.full_name = NEW.assignee;

    IF assignee_profile.id IS NOT NULL THEN
      template_vars := jsonb_build_object(
        'task_title', NEW.title,
        'assignee_name', assignee_profile.full_name,
        'task_description', COALESCE(NEW.description, ''),
        'changes_list', changes_list,
        'updater_name', updater_name,
        'task_url', format('%s/progress?task=%s', current_setting('app.domain'), NEW.id)
      );

      PERFORM queue_email(
        assignee_profile.email,
        'task_field_update',
        template_vars
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for task updates
CREATE TRIGGER on_task_field_update
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_field_updates();