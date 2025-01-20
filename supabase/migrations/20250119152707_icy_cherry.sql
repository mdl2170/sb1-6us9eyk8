-- Create Edge Function URL configuration
SELECT set_config('app.edge_function_url', 'https://ixqnrzpeiwutbcrybkrl.supabase.co/functions/v1', false);

-- Add Edge Function URL to app_config table
INSERT INTO app_config (key, value, description)
VALUES (
  'edge_function_url',
  'https://ixqnrzpeiwutbcrybkrl.supabase.co/functions/v1',
  'Base URL for Edge Functions'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();