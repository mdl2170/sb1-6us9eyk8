-- Create function to send email directly via SMTP
CREATE OR REPLACE FUNCTION send_smtp_email(
  to_email text,
  subject text,
  body text,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password text,
  sender_email text,
  sender_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM mail.send_mail(
    sender_name || ' <' || sender_email || '>',
    to_email,
    subject,
    body,
    body, -- HTML body
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_password,
    true -- Use TLS
  );
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SMTP Error: %', SQLERRM;
  RETURN false;
END;
$$;

-- Update the process_email_queue function to use direct SMTP
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_record record;
  smtp_config record;
  send_result boolean;
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

    -- Send email directly via SMTP
    BEGIN
      SELECT send_smtp_email(
        email_record.to_email,
        email_record.subject,
        email_record.body,
        smtp_config.host,
        smtp_config.port::integer,
        smtp_config.username,
        smtp_config.password,
        smtp_config.sender_email,
        smtp_config.sender_name
      ) INTO send_result;

      IF send_result THEN
        -- Mark as sent
        UPDATE email_queue
        SET 
          status = 'sent',
          sent_at = now(),
          error_message = NULL
        WHERE id = email_record.id;

        -- Log success
        RAISE NOTICE 'Email sent successfully to %', email_record.to_email;
      ELSE
        RAISE EXCEPTION 'Failed to send email via SMTP';
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