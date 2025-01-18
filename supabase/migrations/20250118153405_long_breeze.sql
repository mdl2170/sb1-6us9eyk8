/*
  # Edge Function for Email Processing

  1. New Features
    - Add Edge function to process email queue
    - Add retry mechanism
    - Add error handling
*/

-- Create type for email result
CREATE TYPE email_result AS (
  success boolean,
  error text
);

-- Function to process email queue
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_record record;
  smtp_config record;
BEGIN
  -- Get SMTP configuration
  SELECT 
    (SELECT value FROM app_config WHERE key = 'smtp_host') as host,
    (SELECT value FROM app_config WHERE key = 'smtp_port') as port,
    (SELECT value FROM app_config WHERE key = 'smtp_user') as username,
    (SELECT value FROM app_config WHERE key = 'smtp_password') as password,
    (SELECT value FROM app_config WHERE key = 'sender_email') as sender_email,
    (SELECT value FROM app_config WHERE key = 'sender_name') as sender_name
  INTO smtp_config;

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
      SELECT http_post(
        current_setting('app.edge_function_url') || '/send-email',
        jsonb_build_object(
          'to', email_record.to_email,
          'subject', email_record.subject,
          'html', email_record.body,
          'smtp', jsonb_build_object(
            'host', smtp_config.host,
            'port', smtp_config.port::integer,
            'username', smtp_config.username,
            'password', smtp_config.password,
            'sender_email', smtp_config.sender_email,
            'sender_name', smtp_config.sender_name
          )
        )
      );

      -- Mark as sent
      UPDATE email_queue
      SET 
        status = 'sent',
        sent_at = now()
      WHERE id = email_record.id;

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
    END;
  END LOOP;
END;
$$;