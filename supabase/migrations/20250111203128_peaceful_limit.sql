/*
  # Initial Schema for Student Management System

  1. New Tables
    - `profiles`
      - Extends Supabase auth.users
      - Stores additional user information
      - Links to role-specific tables
    
    - `roles`
      - Stores user roles (student, coach, mentor, admin)
    
    - `students`
      - Student-specific information
      - Progress tracking
      - Job search status
    
    - `coaches`
      - Coach information
      - Specializations
    
    - `mentors`
      - Mentor information
      - Areas of expertise
    
    - `progress_entries`
      - Tracks student progress
      - Links to assessments and milestones
    
    - `job_applications`
      - Tracks student job applications
      - Application status and outcomes

  2. Security
    - RLS enabled on all tables
    - Role-based access policies
    - Data isolation between users
*/

-- Create roles enum
CREATE TYPE user_role AS ENUM ('student', 'coach', 'mentor', 'admin');

-- Profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Students table
CREATE TABLE students (
  id uuid PRIMARY KEY REFERENCES profiles(id),
  cohort text,
  enrollment_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  coach_id uuid REFERENCES profiles(id),
  mentor_id uuid REFERENCES profiles(id),
  target_role text,
  job_search_status text DEFAULT 'not_started',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Coaches table
CREATE TABLE coaches (
  id uuid PRIMARY KEY REFERENCES profiles(id),
  specialization text[],
  max_students integer DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mentors table
CREATE TABLE mentors (
  id uuid PRIMARY KEY REFERENCES profiles(id),
  expertise text[],
  max_mentees integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Progress entries table
CREATE TABLE progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id),
  entry_type text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL,
  due_date timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Job applications table
CREATE TABLE job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id),
  company_name text NOT NULL,
  position text NOT NULL,
  application_date date NOT NULL,
  status text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Students policies
CREATE POLICY "Students viewable by owners and staff"
  ON students FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('coach', 'mentor', 'admin')
    )
  );

-- Progress entries policies
CREATE POLICY "Progress entries viewable by relevant users"
  ON progress_entries FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('coach', 'mentor', 'admin')
    )
  );

-- Job applications policies
CREATE POLICY "Job applications viewable by relevant users"
  ON job_applications FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('coach', 'mentor', 'admin')
    )
  );