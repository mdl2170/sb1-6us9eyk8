/*
  # Fix RLS policies for user signup

  1. Changes
    - Add policy to allow users to insert their own profile
    - Add policy to allow users to insert their own student record
    - Modify existing policies to be more specific

  2. Security
    - Maintains security while allowing necessary operations
    - Users can only create/modify their own records
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new profile policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add student insert policy
CREATE POLICY "Students can insert their own record"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = id);