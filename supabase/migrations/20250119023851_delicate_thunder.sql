-- Create app configuration if it doesn't exist
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "App config is viewable by authenticated users"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only service role can modify app config"
  ON app_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to get configuration value
CREATE OR REPLACE FUNCTION get_config(config_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_value text;
BEGIN
  SELECT value INTO config_value
  FROM app_config
  WHERE key = config_key;
  
  RETURN config_value;
END;
$$;

-- Function to set configuration value
CREATE OR REPLACE FUNCTION set_config(config_key text, config_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO app_config (key, value)
  VALUES (config_key, config_value)
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();
END;
$$;

-- Set default app domain
SELECT set_config('app.domain', 'https://yourdomain.com');

-- Update notify_task_field_updates function to use get_config
CREATE OR REPLACE FUNCTION notify_task_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assignee_profile record;
  updater_name text;
  changes_list text;
  template_vars jsonb;
  app_domain text;
BEGIN
  -- Only proceed if there are relevant changes
  IF (OLD.status = NEW.status AND 
      OLD.priority = NEW.priority AND 
      OLD.due_date = NEW.due_date AND 
      OLD.assignee = NEW.assignee AND 
      OLD.description = NEW.description) THEN
    RETURN NEW;
  END IF;

  -- Get app domain
  app_domain := get_config('app.domain');

  -- Get updater's name
  SELECT full_name INTO updater_name
  FROM profiles
  WHERE id = auth.uid();

  -- Generate changes list
  changes_list := generate_changes_list(
    row_to_json(OLD)::jsonb,
    row_to_json(NEW)::jsonb
  );

  -- If assignee changed, notify both old and new assignee
  IF OLD.assignee IS DISTINCT FROM NEW.assignee THEN
    -- Notify old assignee if exists
    IF OLD.assignee IS NOT NULL THEN
      SELECT p.id, p.email, p.full_name 
      INTO assignee_profile
      FROM profiles p
      WHERE p.full_name = OLD.assignee;

      IF assignee_profile.id IS NOT NULL THEN
        template_vars := jsonb_build_object(
          'task_title', NEW.title,
          'assignee_name', assignee_profile.full_name,
          'task_description', COALESCE(NEW.description, ''),
          'changes_list', changes_list,
          'updater_name', updater_name,
          'task_url', format('%s/progress?task=%s', app_domain, NEW.id)
        );

        PERFORM queue_email(
          assignee_profile.email,
          'task_field_update',
          template_vars
        );
      END IF;
    END IF;
  END IF;

  -- Notify current/new assignee
  IF NEW.assignee IS NOT NULL THEN
    SELECT p.id, p.email, p.full_name 
    INTO assignee_profile
    FROM profiles p
    WHERE p.full_name = NEW.assignee;

    IF assignee_profile.id IS NOT NULL THEN
      template_vars := jsonb_build_object(
        'task_title', NEW.title,
        'assignee_name', assignee_profile.full_name,
        'task_description', COALESCE(NEW.description, ''),
        'changes_list', changes_list,
        'updater_name', updater_name,
        'task_url', format('%s/progress?task=%s', app_domain, NEW.id)
      );

      PERFORM queue_email(
        assignee_profile.email,
        'task_field_update',
        template_vars
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;