/*
  # Email Templates Setup

  1. New Features
    - Add default email templates for task reminders
    - Add template variables support
    - Add HTML email support
*/

-- Insert default email templates
INSERT INTO email_templates (name, subject, body, variables)
VALUES
  (
    'task_due_reminder',
    'Task Due Today: {{task_title}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Task Due Today</h2>
        <p>Hello {{assignee_name}},</p>
        <p>This is a reminder that the following task is due today:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin: 0; color: #1f2937;">{{task_title}}</h3>
          <p style="margin: 10px 0;">{{task_description}}</p>
          <p style="margin: 0;"><strong>Due Date:</strong> {{due_date}}</p>
        </div>
        <p>Please make sure to complete this task on time.</p>
        <a href="{{task_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Task</a>
      </div>
    </body>
    </html>',
    ARRAY['task_title', 'assignee_name', 'task_description', 'due_date', 'task_url']
  ),
  (
    'task_upcoming_reminder',
    'Upcoming Task: {{task_title}} (Due in 2 days)',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Upcoming Task Reminder</h2>
        <p>Hello {{assignee_name}},</p>
        <p>This is a reminder that you have a task due in 2 days:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin: 0; color: #1f2937;">{{task_title}}</h3>
          <p style="margin: 10px 0;">{{task_description}}</p>
          <p style="margin: 0;"><strong>Due Date:</strong> {{due_date}}</p>
        </div>
        <p>Please ensure you''re on track to complete this task by the due date.</p>
        <a href="{{task_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Task</a>
      </div>
    </body>
    </html>',
    ARRAY['task_title', 'assignee_name', 'task_description', 'due_date', 'task_url']
  ),
  (
    'task_update_notification',
    'New Update on Task: {{task_title}}',
    '<!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Task Update</h2>
        <p>Hello {{recipient_name}},</p>
        <p>{{updater_name}} has posted an update on task "{{task_title}}":</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0;">{{update_content}}</p>
        </div>
        <a href="{{task_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Task</a>
      </div>
    </body>
    </html>',
    ARRAY['task_title', 'recipient_name', 'updater_name', 'update_content', 'task_url']
  );