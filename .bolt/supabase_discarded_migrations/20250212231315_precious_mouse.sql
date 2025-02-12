/*
  # Update email sender configuration

  1. Changes
    - Update email templates to use configured sender name
    - Update notification functions to use sender name from app_config
    - Add function to get email configuration

  2. Security
    - Maintain existing security policies
    - Functions remain security definer
*/

-- Function to get email configuration
CREATE OR REPLACE FUNCTION get_email_config()
RETURNS TABLE (
  sender_name text,
  sender_email text,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT value FROM app_config WHERE key = 'sender_name'), 'CPI Admin') as sender_name,
    COALESCE((SELECT value FROM app_config WHERE key = 'sender_email'), 'notifications@careerpassinstitute.com') as sender_email,
    (SELECT value FROM app_config WHERE key = 'smtp_host') as smtp_host,
    (SELECT value::integer FROM app_config WHERE key = 'smtp_port') as smtp_port,
    (SELECT value FROM app_config WHERE key = 'smtp_user') as smtp_user,
    (SELECT value FROM app_config WHERE key = 'smtp_password') as smtp_password;
END;
$$;

-- Update process_email_queue to use configured sender name
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_record record;
  email_config record;
  anon_key text;
BEGIN
  -- Get email configuration
  SELECT * INTO email_config
  FROM get_email_config();

  -- Get anon key
  SELECT value INTO anon_key
  FROM app_config
  WHERE key = 'supabase_anon_key';

  -- Process pending emails
  FOR email_record IN
    SELECT *
    FROM email_queue
    WHERE status = 'pending'
    AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY created_at
    LIMIT 50
  LOOP
    -- Update status to processing
    UPDATE email_queue
    SET status = 'processing'
    WHERE id = email_record.id;

    -- Call Edge function to send email
    BEGIN
      PERFORM http_post(
        (SELECT value FROM app_config WHERE key = 'edge_function_url') || '/send-email',
        jsonb_build_object(
          'to', email_record.to_email,
          'subject', email_record.subject,
          'html', email_record.body,
          'smtp', jsonb_build_object(
            'host', email_config.smtp_host,
            'port', email_config.smtp_port,
            'username', email_config.smtp_user,
            'password', email_config.smtp_password,
            'sender_email', email_config.sender_email,
            'sender_name', email_config.sender_name
          )
        ),
        'Authorization: Bearer ' || anon_key || '; Content-Type: application/json'
      );

      -- Mark as sent
      UPDATE email_queue
      SET 
        status = 'sent',
        sent_at = now(),
        error_message = NULL
      WHERE id = email_record.id;

      -- Log success
      RAISE NOTICE 'Email sent successfully to %', email_record.to_email;

    EXCEPTION WHEN OTHERS THEN
      -- Handle failure
      UPDATE email_queue
      SET
        status = CASE WHEN retry_count >= 3 THEN 'failed' ELSE 'pending' END,
        error_message = SQLERRM,
        retry_count = retry_count + 1,
        next_retry_at = CASE 
          WHEN retry_count < 3 THEN 
            now() + (power(2, retry_count) * interval '1 hour')
          ELSE 
            NULL 
        END
      WHERE id = email_record.id;

      -- Log error
      RAISE NOTICE 'Failed to send email to %: %', email_record.to_email, SQLERRM;
    END;
  END LOOP;
END;
$$;