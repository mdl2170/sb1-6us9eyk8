-- Create welcome email template
INSERT INTO email_templates (name, subject, body, variables)
VALUES (
  'welcome_user',
  'Welcome to Task Manager - Set Up Your Account',
  '<!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Welcome to Task Manager</h2>
      <p>Hello {{user_name}},</p>
      <p>Your account has been created successfully. To get started, please set up your password by clicking the button below:</p>
      <div style="margin: 25px 0;">
        <a href="{{reset_password_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Set Password</a>
      </div>
      <p>If the button doesn''t work, you can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6b7280;">{{reset_password_url}}</p>
      <p>For security reasons, this link will expire in 24 hours.</p>
      <p>If you need any assistance, please contact your administrator.</p>
    </div>
  </body>
  </html>',
  ARRAY['user_name', 'reset_password_url']
);

-- Function to send welcome email
CREATE OR REPLACE FUNCTION send_welcome_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record record;
  reset_token text;
  app_url text;
BEGIN
  -- Get user details
  SELECT email, full_name INTO user_record
  FROM profiles
  WHERE id = user_id;

  -- Get app URL
  SELECT value INTO app_url
  FROM app_config
  WHERE key = 'app.domain';

  -- Generate password reset token
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at)
  VALUES (gen_random_uuid(), user_id, 'authenticated', 'authenticated', user_record.email, '', now(), now(), '', now(), '', now(), '', '', now(), now(), '{}', '{}', false, now(), now(), '', now(), '', '', now(), '', 0, now(), '', now())
  RETURNING recovery_token INTO reset_token;

  -- Queue welcome email
  PERFORM queue_email(
    user_record.email,
    'welcome_user',
    jsonb_build_object(
      'user_name', COALESCE(user_record.full_name, split_part(user_record.email, '@', 1)),
      'reset_password_url', app_url || '/reset-password?token=' || reset_token
    )
  );
END;
$$;