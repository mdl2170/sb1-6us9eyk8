-- Update password reset handling to use email queue
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
  WHERE id = NEW.id;

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
      'reset_url', app_url || '/reset-password?token=' || NEW.recovery_token
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to handle recovery token changes
DROP TRIGGER IF EXISTS on_password_reset_request ON auth.users;
CREATE TRIGGER on_password_reset_request
  AFTER UPDATE OF recovery_token ON auth.users
  FOR EACH ROW
  WHEN (NEW.recovery_token IS NOT NULL AND OLD.recovery_token IS NULL)
  EXECUTE FUNCTION handle_password_reset_request();

-- Create function to handle password reset requests through RPC
CREATE OR REPLACE FUNCTION request_password_reset(email_address text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record record;
BEGIN
  -- Find user by email
  SELECT id, email, raw_user_meta_data->>'full_name' as full_name
  INTO user_record
  FROM auth.users
  WHERE email = email_address;

  IF user_record IS NULL THEN
    -- Return silently to prevent email enumeration
    RETURN;
  END IF;

  -- Generate recovery token
  UPDATE auth.users
  SET 
    recovery_token = encode(gen_random_bytes(32), 'hex'),
    recovery_sent_at = now()
  WHERE id = user_record.id;
END;
$$;