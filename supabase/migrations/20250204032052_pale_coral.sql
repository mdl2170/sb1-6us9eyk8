-- Function to send welcome email
CREATE OR REPLACE FUNCTION send_welcome_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record record;
  app_url text;
  token text;
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
  UPDATE auth.users 
  SET recovery_token = encode(gen_random_bytes(32), 'hex'),
      recovery_sent_at = now()
  WHERE id = user_id
  RETURNING recovery_token INTO token;

  IF token IS NULL THEN
    RAISE EXCEPTION 'Failed to generate reset token for user';
  END IF;

  -- Queue welcome email
  PERFORM queue_email(
    user_record.email,
    'welcome_user',
    jsonb_build_object(
      'user_name', COALESCE(user_record.full_name, split_part(user_record.email, '@', 1)),
      'reset_password_url', app_url || '/reset-password?token=' || token
    )
  );
END;
$$;