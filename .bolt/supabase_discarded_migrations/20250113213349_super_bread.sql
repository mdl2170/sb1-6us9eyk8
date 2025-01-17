/*
  # Add status column to profiles table

  1. Changes
    - Add status column to profiles table with default value 'active'
    - Add check constraint to ensure valid status values
    - Update existing rows to have 'active' status

  2. Status Values
    - active: User is active and can access the system
    - inactive: User is temporarily disabled
    - suspended: User is suspended due to policy violations
    - archived: User account has been archived
*/

-- Add status column with check constraint
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'inactive', 'suspended', 'archived'));

-- Update existing rows to have 'active' status
UPDATE profiles SET status = 'active' WHERE status IS NULL;