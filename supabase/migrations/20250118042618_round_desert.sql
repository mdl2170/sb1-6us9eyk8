/*
  # Update email configuration

  1. Changes
    - Adds environment variable support for email domain and from address
    - Updates email templates with configurable domain
*/

-- Function to get application URL
CREATE OR REPLACE FUNCTION get_app_url()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  -- This can be updated to use a configuration parameter if needed
  SELECT current_setting('app.domain', true);
$$;

-- Update the notification function to use environment variables
CREATE OR REPLACE FUNCTION notify_task_update_users()
RETURNS trigger AS $$
DECLARE
  task_record record;
  assignee_profile record;
  mentioned_user record;
  creator_name text;
  app_url text;
BEGIN
  -- Get task details including assignee
  SELECT title, assignee INTO task_record
  FROM tasks
  WHERE id = NEW.task_id;

  -- Get creator's name
  SELECT full_name INTO creator_name
  FROM profiles 
  WHERE id = NEW.created_by;

  -- Get application URL
  app_url := get_app_url();

  -- Handle assignee notification
  IF task_record.assignee IS NOT NULL THEN
    SELECT p.id, p.email, p.full_name 
    INTO assignee_profile
    FROM profiles p
    WHERE p.full_name = task_record.assignee
    AND p.id != NEW.created_by;

    IF assignee_profile.id IS NOT NULL THEN
      -- Create in-app notification
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link
      ) VALUES (
        assignee_profile.id,
        'New Task Update',
        format('New update on task "%s" by %s', task_record.title, creator_name),
        'task_update',
        format('/progress?task=%s', NEW.task_id)
      );

      -- Send email
      PERFORM http_post(
        'https://api.resend.com/emails',
        jsonb_build_object(
          'from', current_setting('app.email_from'),
          'to', assignee_profile.email,
          'subject', format('New update on task: %s', task_record.title),
          'html', format(
            'Hello %s,<br><br>%s posted an update on task "%s":<br><br>%s<br><br>View the task: <a href="%s">Click here</a>',
            assignee_profile.full_name,
            creator_name,
            task_record.title,
            NEW.content,
            format('%s/progress?task=%s', app_url, NEW.task_id)
          )
        ),
        jsonb_build_object(
          'Authorization', format('Bearer %s', current_setting('app.resend_api_key'))
        )
      );
    END IF;
  END IF;

  -- Handle mentioned users notifications
  IF NEW.mentions IS NOT NULL AND array_length(NEW.mentions, 1) > 0 THEN
    FOR mentioned_user IN
      SELECT p.id, p.email, p.full_name
      FROM profiles p
      WHERE p.full_name = ANY(NEW.mentions)
      AND p.id != NEW.created_by
      AND (assignee_profile.id IS NULL OR p.id != assignee_profile.id)
    LOOP
      -- Create in-app notification
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link
      ) VALUES (
        mentioned_user.id,
        'Mentioned in Task Update',
        format('You were mentioned in an update on task "%s" by %s', task_record.title, creator_name),
        'mention',
        format('/progress?task=%s', NEW.task_id)
      );

      -- Send email
      PERFORM http_post(
        'https://api.resend.com/emails',
        jsonb_build_object(
          'from', current_setting('app.email_from'),
          'to', mentioned_user.email,
          'subject', format('You were mentioned in a task update: %s', task_record.title),
          'html', format(
            'Hello %s,<br><br>%s mentioned you in an update on task "%s":<br><br>%s<br><br>View the task: <a href="%s">Click here</a>',
            mentioned_user.full_name,
            creator_name,
            task_record.title,
            NEW.content,
            format('%s/progress?task=%s', app_url, NEW.task_id)
          )
        ),
        jsonb_build_object(
          'Authorization', format('Bearer %s', current_setting('app.resend_api_key'))
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set default values for email configuration
SELECT set_config('app.domain', 'https://yourdomain.com', false);
SELECT set_config('app.email_from', 'Task Manager <notifications@yourdomain.com>', false);