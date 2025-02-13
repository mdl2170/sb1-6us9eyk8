/*
  # Add task update notifications

  1. New Functions
    - `notify_task_update_users`: Sends emails to task assignee and mentioned users
    - Handles both in-app notifications and email notifications for task updates

  2. Changes
    - Replaces the existing notification system with a combined approach
    - Uses http_post for sending emails via Resend API
*/

-- Function to send emails to task assignee and mentioned users
CREATE OR REPLACE FUNCTION notify_task_update_users()
RETURNS trigger AS $$
DECLARE
  task_record record;
  assignee_profile record;
  mentioned_user record;
  creator_name text;
BEGIN
  -- Get task details including assignee
  SELECT title, assignee INTO task_record
  FROM tasks
  WHERE id = NEW.task_id;

  -- Get creator's name
  SELECT full_name INTO creator_name
  FROM profiles 
  WHERE id = NEW.created_by;

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
          'from', 'Task Manager <notifications@yourdomain.com>',
          'to', assignee_profile.email,
          'subject', format('New update on task: %s', task_record.title),
          'html', format(
            'Hello %s,<br><br>%s posted an update on task "%s":<br><br>%s<br><br>View the task: <a href="%s">Click here</a>',
            assignee_profile.full_name,
            creator_name,
            task_record.title,
            NEW.content,
            format('https://yourdomain.com/progress?task=%s', NEW.task_id)
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
          'from', 'Task Manager <notifications@yourdomain.com>',
          'to', mentioned_user.email,
          'subject', format('You were mentioned in a task update: %s', task_record.title),
          'html', format(
            'Hello %s,<br><br>%s mentioned you in an update on task "%s":<br><br>%s<br><br>View the task: <a href="%s">Click here</a>',
            mentioned_user.full_name,
            creator_name,
            task_record.title,
            NEW.content,
            format('https://yourdomain.com/progress?task=%s', NEW.task_id)
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

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_task_update_mention ON task_updates;

-- Create new trigger that handles both notifications and emails
CREATE TRIGGER on_task_update
  AFTER INSERT ON task_updates
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_update_users();