/*
  # Add Resend API configuration

  1. Changes
    - Adds app.resend_api_key configuration parameter
    - Sets up http extension for email sending
*/

-- Enable http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create app settings schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS app;

-- Create configuration parameter for Resend API key
SELECT set_config('app.resend_api_key', '', false);

-- Create function to update Resend API key
CREATE OR REPLACE FUNCTION app.set_resend_api_key(api_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    JOIN public.profiles ON auth.users.id = profiles.id
    WHERE auth.users.id = auth.uid()
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can update the Resend API key';
  END IF;

  -- Update the configuration
  PERFORM set_config('app.resend_api_key', api_key, false);
END;
$$;