-- Update app domain in app_config
UPDATE app_config
SET value = 'https://your-actual-domain.com'
WHERE key = 'app.domain';

-- If the config doesn't exist, insert it
INSERT INTO app_config (key, value, description)
SELECT 
  'app.domain',
  'https://your-actual-domain.com',
  'Application domain URL'
WHERE NOT EXISTS (
  SELECT 1 FROM app_config WHERE key = 'app.domain'
);