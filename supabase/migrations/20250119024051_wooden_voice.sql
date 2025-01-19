-- Drop existing function
DROP FUNCTION IF EXISTS process_email_template(text, jsonb);

-- Recreate function with proper column definition
CREATE OR REPLACE FUNCTION process_email_template(
  template_name text,
  template_vars jsonb
)
RETURNS TABLE (
  subject text,
  body text
)
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

  RETURN QUERY SELECT processed_subject, processed_body;
END;
$$;

-- Update queue_email function to handle the new return type
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