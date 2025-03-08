-- Update the handle_new_user function to create student record
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')::user_role,
    'active',
    NOW(),
    NOW()
  );

  -- If role is student, create student record
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student' THEN
    INSERT INTO students (
      id,
      enrollment_date,
      status,
      weekly_review_day,
      alert_threshold_applications,
      alert_threshold_networking,
      alert_threshold_interviews,
      target_companies_count,
      weekly_application_goal,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NOW(),
      'active',
      1, -- Monday by default
      5,  -- Default alert thresholds
      3,
      2,
      10,
      5,
      NOW(),
      NOW()
    );

    -- Create initial career goals
    INSERT INTO career_goals (
      student_id,
      weekly_application_goal,
      weekly_connection_goal,
      weekly_interview_goal,
      weekly_event_goal,
      monthly_alumni_goal,
      monthly_industry_goal,
      monthly_recruiter_goal,
      campaign_start_date,
      campaign_end_date
    ) VALUES (
      NEW.id,
      5,  -- Default goals
      5,
      2,
      1,
      3,
      5,
      3,
      NOW(),
      NOW() + interval '6 months'
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;