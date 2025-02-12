-- Create password reset email template
INSERT INTO email_templates (name, subject, body, variables)
VALUES (
  'password_reset',
  'Reset Your Password - CPI Student Management System',
  '<!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Reset Your Password</h2>
      <p>Hello {{user_name}},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="margin: 25px 0;">
        <a href="{{reset_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      </div>
      <p>If you didn''t request this password reset, you can safely ignore this email.</p>
      <p>For security reasons, this link will expire in 24 hours.</p>
      <p style="margin-top: 25px; font-size: 12px; color: #666;">
        If the button doesn''t work, copy and paste this URL into your browser:<br>
        {{reset_url}}
      </p>
    </div>
  </body>
  </html>',
  ARRAY['user_name', 'reset_url']
);

-- Function to handle password reset requests
CREATE OR REPLACE FUNCTION handle_password_reset_request()
RETURNS trigger AS $$
DECLARE
  user_record record;
  app_url text;
BEGIN
  -- Get user details
  SELECT email, raw_user_meta_data->>'full_name' as full_name 
  INTO user_record
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Get app URL
  SELECT value INTO app_url
  FROM app_config
  WHERE key = 'app.domain';

  -- Queue password reset email
  PERFORM queue_email(
    user_record.email,
    'password_reset',
    jsonb_build_object(
      'user_name', COALESCE(user_record.full_name, split_part(user_record.email, '@', 1)),
      'reset_url', app_url || '/reset-password?token=' || NEW.token
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for password reset requests
DROP TRIGGER IF EXISTS on_password_reset_request ON auth.users;
CREATE TRIGGER on_password_reset_request
  AFTER UPDATE OF recovery_token ON auth.users
  FOR EACH ROW
  WHEN (NEW.recovery_token IS NOT NULL AND OLD.recovery_token IS NULL)
  EXECUTE FUNCTION handle_password_reset_request();