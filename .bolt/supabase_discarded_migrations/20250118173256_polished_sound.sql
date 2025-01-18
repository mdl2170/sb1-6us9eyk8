-- First, set the Edge Function URL
INSERT INTO app_config (key, value, description)
VALUES (
  'edge_function_url',
  'https://ixqnrzpeiwutbcrybkrl.supabase.co/functions/v1',
  'Base URL for Edge Functions'
) ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value;

-- Then configure SMTP settings
SELECT update_email_config(
  'smtp.gmail.com',        -- Replace with your SMTP host
  587,                       -- Replace with your SMTP port
  'minh.le@careerpassinstitute.com',          -- Replace with your SMTP username
  'qqnl gdlo ifsn hzhh',          -- Replace with your SMTP password
  'minh.le@careerpassinstitute.com', -- Replace with sender email
  'CPI Admin'            -- Replace with sender name
);