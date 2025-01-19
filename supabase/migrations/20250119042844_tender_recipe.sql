/*
  # Add email queue monitoring

  1. Changes
    - Add email_queue_logs table to track function execution
    - Add monitoring functions to check queue status
    - Add function to manually trigger queue processing
*/

-- Create email queue logs table
CREATE TABLE IF NOT EXISTS email_queue_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  emails_processed integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  emails_failed integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_queue_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can view email queue logs"
  ON email_queue_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to get queue status
CREATE OR REPLACE FUNCTION get_email_queue_status()
RETURNS TABLE (
  pending_emails bigint,
  failed_emails bigint,
  last_run_at timestamptz,
  last_error text,
  success_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM email_queue WHERE status = 'pending')::bigint as pending_emails,
    (SELECT COUNT(*) FROM email_queue WHERE status = 'failed')::bigint as failed_emails,
    (SELECT MAX(completed_at) FROM email_queue_logs) as last_run_at,
    (SELECT error_message FROM email_queue_logs WHERE error_message IS NOT NULL ORDER BY created_at DESC LIMIT 1) as last_error,
    CASE
      WHEN (SELECT COUNT(*) FROM email_queue) = 0 THEN 100
      ELSE
        ROUND(
          (SELECT COUNT(*)::numeric FROM email_queue WHERE status = 'sent') /
          (SELECT COUNT(*)::numeric FROM email_queue) * 100,
          2
        )
    END as success_rate;
END;
$$;

-- Update process_email_queue to include logging
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_record record;
  smtp_config record;
  log_id uuid;
  processed_count integer := 0;
  sent_count integer := 0;
  failed_count integer := 0;
  last_error text;
BEGIN
  -- Create log entry
  INSERT INTO email_queue_logs (started_at)
  VALUES (now())
  RETURNING id INTO log_id;

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
    processed_count := processed_count + 1;

    -- Update status to processing
    UPDATE email_queue
    SET status = 'processing'
    WHERE id = email_record.id;

    -- Call Edge function to send email
    BEGIN
      PERFORM http_post(
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

      sent_count := sent_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Handle failure
      last_error := SQLERRM;
      failed_count := failed_count + 1;

      UPDATE email_queue
      SET
        status = CASE WHEN retry_count >= 3 THEN 'failed' ELSE 'pending' END,
        error_message = last_error,
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

  -- Update log entry
  UPDATE email_queue_logs
  SET
    completed_at = now(),
    emails_processed = processed_count,
    emails_sent = sent_count,
    emails_failed = failed_count,
    error_message = last_error
  WHERE id = log_id;
END;
$$;

-- Function to manually trigger queue processing (admin only)
CREATE OR REPLACE FUNCTION trigger_email_queue_processing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can trigger email queue processing';
  END IF;

  -- Process queue
  PERFORM process_email_queue();

  -- Get results
  SELECT jsonb_build_object(
    'success', true,
    'processed_at', completed_at,
    'emails_processed', emails_processed,
    'emails_sent', emails_sent,
    'emails_failed', emails_failed,
    'error_message', error_message
  )
  INTO result
  FROM email_queue_logs
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN result;
END;
$$;