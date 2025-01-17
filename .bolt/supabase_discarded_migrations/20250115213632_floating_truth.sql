/*
  # Drop Auth Triggers

  1. Changes
    - Drop the `on_auth_user_created` trigger on `auth.users` table
    - Drop the `on_auth_user_access` trigger on `auth.users` table
    - Drop their associated functions

  2. Notes
    - This removes automatic profile creation on user signup
    - Profile creation should now be handled explicitly in the application code
*/

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_access ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_auth_user_access();