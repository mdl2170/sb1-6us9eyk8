-- Update send_welcome_email function to not trigger password reset
CREATE OR REPLACE FUNCTION send_welcome_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  user_record record;
  app_url text;
  token text;
BEGIN
  -- Get user details
  SELECT email, raw_user_meta_data->>'full_name' as full_name
  INTO user_record
  FROM users
  WHERE id = user_id;

  -- Get app URL
  SELECT value INTO app_url
  FROM app_config
  WHERE key = 'app.domain';

  -- Generate token without updating recovery_token
  token := replace(gen_random_uuid()::text, '-', '');

  -- Queue welcome email directly
  PERFORM queue_email(
    user_record.email,
    'welcome_user',
    jsonb_build_object(
      'user_name', COALESCE(user_record.full_name, split_part(user_record.email, '@', 1)),
      'reset_password_url', app_url || '/reset-password?token=' || token
    )
  );

  -- Update user with token but don't trigger recovery_token update
  UPDATE users
  SET 
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{welcome_token}',
      to_jsonb(token)
    ),
    updated_at = now()
  WHERE id = user_id;
END;
$$;