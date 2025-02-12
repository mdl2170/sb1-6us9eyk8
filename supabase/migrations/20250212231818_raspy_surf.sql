/*
  # Update email configuration to use Resend

  1. Changes
    - Add Resend API key configuration
    - Update email sending functions to use Resend
    - Remove SMTP-specific configuration

  2. Security
    - Maintain existing security policies
    - Functions remain security definer
*/

-- Function to send email via Resend
CREATE OR REPLACE FUNCTION send_email(
  to_email text,
  subject text,
  html_body text,
  from_name text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resend_key text;
  sender_name text;
  sender_email text;
BEGIN
  -- Get Resend API key
  SELECT value INTO resend_key
  FROM app_config
  WHERE key = 'resend_api_key';

  -- Get sender configuration
  SELECT value INTO sender_name
  FROM app_config
  WHERE key = 'sender_name';

  SELECT value INTO sender_email
  FROM app_config
  WHERE key = 'sender_email';

  -- Use default values if not configured
  sender_name := COALESCE(from_name, sender_name, 'CPI Admin');
  sender_email := COALESCE(sender_email, 'notifications@careerpassinstitute.com');

  -- Send email via Resend API
  PERFORM http_post(
    'https://api.resend.com/emails',
    jsonb_build_object(
      'from', format('%s <%s>', sender_name, sender_email),
      'to', to_email,
      'subject', subject,
      'html', html_body
    ),
    format('Authorization: Bearer %s', resend_key)
  );

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to send email: %', SQLERRM;
  RETURN false;
END;
$$;

-- Update process_email_queue to use Resend
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_record record;
BEGIN
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

    -- Send email via Resend
    BEGIN
      IF send_email(
        email_record.to_email,
        email_record.subject,
        email_record.body
      ) THEN
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
        RAISE EXCEPTION 'Failed to send email via Resend';
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

-- Remove old SMTP configuration if it exists
DO $$
BEGIN
  DELETE FROM app_config WHERE key IN (
    'smtp_host',
    'smtp_port',
    'smtp_user',
    'smtp_password'
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;