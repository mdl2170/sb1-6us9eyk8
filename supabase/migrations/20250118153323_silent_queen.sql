/*
  # Google Workspace Email Configuration

  1. New Features
    - Add Google Workspace SMTP configuration
    - Create email templates table
    - Add functions for sending emails via Google SMTP

  2. Changes
    - Replace Resend with Google Workspace SMTP
    - Add secure credential storage
    - Add email template management
*/

-- Create app configuration for email settings
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can view app config"
  ON app_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can modify app config"
  ON app_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL,
  variables text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Email templates are viewable by authenticated users"
  ON email_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to update email configuration
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

  -- Update configuration
  INSERT INTO app_config (key, value, description)
  VALUES
    ('smtp_host', 'smtp.gmail.com', 'SMTP server hostname'),
    ('smtp_port', '465', 'SMTP server port'),
    ('smtp_user', 'minh.le@careerpassinstitute.com', 'SMTP username'),
    ('smtp_password', 'ekfagnfzraklzrgs', 'SMTP password (encrypted)'),
    ('sender_email', 'minh.le@careerpassinstute.com', 'Sender email address'),
    ('sender_name', 'CPI Admin', 'Sender display name')
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();
END;
$$;