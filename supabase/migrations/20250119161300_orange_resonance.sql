-- Update the process_email_queue function to use the http() function directly
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_record record;
  smtp_config record;
  response_status integer;
  response_body jsonb;
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
      SELECT 
        status,
        content::jsonb INTO response_status, response_body
      FROM http(
        'POST',
        (SELECT value FROM app_config WHERE key = 'edge_function_url') || '/send-email',
        ARRAY[('Content-Type', 'application/json')],
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
        )::text
      );

      -- Check response status
      IF response_status >= 200 AND response_status < 300 THEN
        -- Mark as sent
        UPDATE email_queue
        SET 
          status = 'sent',
          sent_at = now(),
          error_message = NULL
        WHERE id = email_record.id;

        -- Log success
        RAISE NOTICE 'Email sent successfully to %: %', email_record.to_email, response_body;
      ELSE
        RAISE EXCEPTION 'Failed to send email. Status: %, Response: %', response_status, response_body;
      END IF;

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