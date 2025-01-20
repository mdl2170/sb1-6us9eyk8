-- Update the process_email_queue function to use the correct Edge Function call format
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_record record;
  smtp_config record;
  anon_key text;
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
            'host', smtp_config.host,
            'port', smtp_config.port::integer,
            'username', smtp_config.username,
            'password', smtp_config.password,
            'sender_email', smtp_config.sender_email,
            'sender_name', smtp_config.sender_name
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

-- Add Supabase anon key to app_config if not exists
INSERT INTO app_config (key, value, description)
VALUES (
  'supabase_anon_key',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cW5yenBlaXd1dGJjcnlia3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2Mjc2NDUsImV4cCI6MjA1MjIwMzY0NX0.dLXcPIfhQpQZ69zNLecg3nRzsPOSDg4kz3yc84CoOKE',
  'Supabase anonymous API key'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();