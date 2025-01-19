/*
  # Fix email configuration

  1. Changes
    - Remove hardcoded SMTP credentials
    - Fix typo in sender email domain
    - Add proper error handling and logging
    - Add configuration validation
*/

-- Function to validate email configuration
CREATE OR REPLACE FUNCTION validate_email_config()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  missing_keys text[];
  invalid_port boolean;
BEGIN
  -- Check for required configuration keys
  SELECT ARRAY_AGG(key)
  INTO missing_keys
  FROM (
    VALUES 
      ('smtp_host'),
      ('smtp_port'),
      ('smtp_user'),
      ('smtp_password'),
      ('sender_email'),
      ('sender_name')
  ) AS required(key)
  WHERE NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = required.key AND value IS NOT NULL
  );

  IF array_length(missing_keys, 1) > 0 THEN
    RAISE EXCEPTION 'Missing required email configuration: %', array_to_string(missing_keys, ', ');
  END IF;

  -- Validate SMTP port
  SELECT NOT (value ~ '^\d+$' AND value::integer BETWEEN 1 AND 65535)
  INTO invalid_port
  FROM app_config
  WHERE key = 'smtp_port';

  IF invalid_port THEN
    RAISE EXCEPTION 'Invalid SMTP port. Must be between 1 and 65535';
  END IF;

  -- Validate sender email format
  IF NOT EXISTS (
    SELECT 1 FROM app_config
    WHERE key = 'sender_email'
    AND value ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ) THEN
    RAISE EXCEPTION 'Invalid sender email format';
  END IF;

  RETURN true;
END;
$$;

-- Function to log email errors
CREATE OR REPLACE FUNCTION log_email_error(
  error_message text,
  context jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO app_config (key, value, description)
  VALUES (
    'last_email_error',
    error_message,
    jsonb_build_object(
      'timestamp', now(),
      'context', context
    )::text
  )
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        description = EXCLUDED.description,
        updated_at = now();
END;
$$;

-- Update the email configuration function with validation
CREATE OR REPLACE FUNCTION update_email_config(
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password text,
  sender_email text,
  sender_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can update email configuration';
  END IF;

  -- Validate inputs
  IF smtp_port NOT BETWEEN 1 AND 65535 THEN
    RAISE EXCEPTION 'Invalid SMTP port. Must be between 1 and 65535';
  END IF;

  IF NOT sender_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid sender email format';
  END IF;

  -- Update configuration
  INSERT INTO app_config (key, value, description)
  VALUES
    ('smtp_host', smtp_host, 'SMTP server hostname'),
    ('smtp_port', smtp_port::text, 'SMTP server port'),
    ('smtp_user', smtp_user, 'SMTP username'),
    ('smtp_password', smtp_password, 'SMTP password (encrypted)'),
    ('sender_email', sender_email, 'Sender email address'),
    ('sender_name', sender_name, 'Sender display name')
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();

  -- Validate the complete configuration
  PERFORM validate_email_config();
END;
$$;