/*
  # Add sample data for dashboard testing
  
  1. Sample Data
    - Assign students to coach
    - Generate job applications
    - Generate networking interactions
    - Generate tasks and task groups
  
  2. Changes
    - Fix enum type casting for all enums
    - Disable notification triggers during sample data generation
    - Use proper date handling for all timestamps
*/

-- Temporarily disable notification triggers
ALTER TABLE tasks DISABLE TRIGGER on_task_creation;
ALTER TABLE tasks DISABLE TRIGGER on_task_field_update;

DO $$
DECLARE
  v_coach_id uuid;
  student_ids uuid[];
  current_date date := CURRENT_DATE;
  i integer;
  j integer;
  student_id uuid;
  group_id uuid;
  task_id uuid;
  company_names text[] := ARRAY[
    'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta',
    'Netflix', 'Uber', 'Airbnb', 'Twitter', 'LinkedIn',
    'Salesforce', 'Adobe', 'Intel', 'IBM', 'Oracle'
  ];
  position_titles text[] := ARRAY[
    'Software Engineer', 'Full Stack Developer', 'Frontend Engineer',
    'Backend Engineer', 'DevOps Engineer', 'Data Engineer',
    'Mobile Developer', 'Cloud Engineer', 'ML Engineer', 'QA Engineer'
  ];
  contact_names text[] := ARRAY[
    'John Smith', 'Emma Johnson', 'Michael Brown', 'Sarah Davis',
    'David Wilson', 'Lisa Anderson', 'James Taylor', 'Jennifer Martin',
    'Robert Thompson', 'Jessica White', 'William Clark', 'Elizabeth Hall',
    'Richard Lee', 'Susan Wright', 'Joseph King'
  ];
  task_titles text[] := ARRAY[
    'Update Resume', 'Apply for Jobs', 'Network on LinkedIn',
    'Practice Coding', 'Mock Interview', 'Research Companies',
    'Update Portfolio', 'Write Cover Letter', 'Follow Up Applications',
    'Attend Tech Events'
  ];
  month_date date;
  task_date date;
  app_status application_status;
  int_type interaction_type;
  int_method interaction_method;
BEGIN
  -- Get coach ID
  SELECT id INTO v_coach_id
  FROM profiles
  WHERE email = 'minh.le@tc.edu';

  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Coach not found';
  END IF;

  -- Get 4 random student IDs
  SELECT ARRAY_AGG(id)
  INTO student_ids
  FROM (
    SELECT id
    FROM students
    WHERE status = 'active'
    ORDER BY RANDOM()
    LIMIT 4
  ) s;

  -- Assign students to coach
  UPDATE students
  SET coach_id = v_coach_id
  WHERE id = ANY(student_ids);

  -- Generate data for past 12 months
  FOR i IN 0..11 LOOP
    month_date := current_date - (i || ' months')::interval;
    
    -- For each student
    FOR j IN 1..array_length(student_ids, 1) LOOP
      student_id := student_ids[j];
      
      -- Create task groups if they don't exist
      IF i = 0 THEN
        -- Job Search group
        INSERT INTO task_groups (title, color, "order", owner_id)
        VALUES ('Job Search', '#2563eb', 0, student_id)
        RETURNING id INTO group_id;

        -- Generate tasks for Job Search group
        FOR k IN 1..floor(random() * 6 + 5)::int LOOP
          task_date := month_date + (floor(random() * 28 + 1))::integer;
          
          INSERT INTO tasks (
            title,
            description,
            status,
            priority,
            group_id,
            assignee,
            due_date,
            created_at,
            created_by,
            "order"
          ) VALUES (
            task_titles[floor(random() * array_length(task_titles, 1) + 1)],
            'Sample task description',
            CASE 
              WHEN random() < 0.6 THEN 'completed'
              WHEN random() < 0.8 THEN 'in_progress'
              ELSE 'pending'
            END,
            CASE floor(random() * 3)::int
              WHEN 0 THEN 'high'
              WHEN 1 THEN 'medium'
              ELSE 'low'
            END,
            group_id,
            (SELECT full_name FROM profiles WHERE id = student_id),
            task_date + (floor(random() * 14))::integer,
            task_date,
            v_coach_id,
            k * 1000
          );
        END LOOP;

        -- Technical Prep group
        INSERT INTO task_groups (title, color, "order", owner_id)
        VALUES ('Technical Prep', '#16a34a', 1, student_id)
        RETURNING id INTO group_id;

        -- Generate tasks for Technical Prep group
        FOR k IN 1..floor(random() * 6 + 5)::int LOOP
          task_date := month_date + (floor(random() * 28 + 1))::integer;
          
          INSERT INTO tasks (
            title,
            description,
            status,
            priority,
            group_id,
            assignee,
            due_date,
            created_at,
            created_by,
            "order"
          ) VALUES (
            task_titles[floor(random() * array_length(task_titles, 1) + 1)],
            'Sample task description',
            CASE 
              WHEN random() < 0.6 THEN 'completed'
              WHEN random() < 0.8 THEN 'in_progress'
              ELSE 'pending'
            END,
            CASE floor(random() * 3)::int
              WHEN 0 THEN 'high'
              WHEN 1 THEN 'medium'
              ELSE 'low'
            END,
            group_id,
            (SELECT full_name FROM profiles WHERE id = student_id),
            task_date + (floor(random() * 14))::integer,
            task_date,
            v_coach_id,
            k * 1000
          );
        END LOOP;

        -- Interview Prep group
        INSERT INTO task_groups (title, color, "order", owner_id)
        VALUES ('Interview Prep', '#eab308', 2, student_id)
        RETURNING id INTO group_id;

        -- Generate tasks for Interview Prep group
        FOR k IN 1..floor(random() * 6 + 5)::int LOOP
          task_date := month_date + (floor(random() * 28 + 1))::integer;
          
          INSERT INTO tasks (
            title,
            description,
            status,
            priority,
            group_id,
            assignee,
            due_date,
            created_at,
            created_by,
            "order"
          ) VALUES (
            task_titles[floor(random() * array_length(task_titles, 1) + 1)],
            'Sample task description',
            CASE 
              WHEN random() < 0.6 THEN 'completed'
              WHEN random() < 0.8 THEN 'in_progress'
              ELSE 'pending'
            END,
            CASE floor(random() * 3)::int
              WHEN 0 THEN 'high'
              WHEN 1 THEN 'medium'
              ELSE 'low'
            END,
            group_id,
            (SELECT full_name FROM profiles WHERE id = student_id),
            task_date + (floor(random() * 14))::integer,
            task_date,
            v_coach_id,
            k * 1000
          );
        END LOOP;
      END IF;

      -- Generate job applications (3-8 per month)
      FOR k IN 1..floor(random() * 6 + 3)::int LOOP
        -- Determine application status
        SELECT CASE floor(random() * 5)::int
          WHEN 0 THEN 'applied'::application_status
          WHEN 1 THEN 'screening'::application_status
          WHEN 2 THEN 'interview'::application_status
          WHEN 3 THEN 'offer'::application_status
          ELSE 'rejected'::application_status
        END INTO app_status;

        INSERT INTO job_applications (
          student_id,
          company_name,
          position_title,
          application_date,
          source,
          status,
          requirements_match
        ) VALUES (
          student_id,
          company_names[floor(random() * array_length(company_names, 1) + 1)],
          position_titles[floor(random() * array_length(position_titles, 1) + 1)],
          month_date + (floor(random() * 28 + 1))::integer,
          'LinkedIn',
          app_status,
          floor(random() * 31 + 70)
        );
      END LOOP;

      -- Generate networking interactions (2-5 per month)
      FOR k IN 1..floor(random() * 4 + 2)::int LOOP
        -- Determine interaction type
        SELECT CASE floor(random() * 4)::int
          WHEN 0 THEN 'alumni'::interaction_type
          WHEN 1 THEN 'industry_professional'::interaction_type
          WHEN 2 THEN 'recruiter'::interaction_type
          ELSE 'other'::interaction_type
        END INTO int_type;

        -- Determine interaction method
        SELECT CASE floor(random() * 6)::int
          WHEN 0 THEN 'linkedin'::interaction_method
          WHEN 1 THEN 'email'::interaction_method
          WHEN 2 THEN 'event'::interaction_method
          WHEN 3 THEN 'call'::interaction_method
          WHEN 4 THEN 'meeting'::interaction_method
          ELSE 'other'::interaction_method
        END INTO int_method;

        INSERT INTO networking_interactions (
          student_id,
          contact_name,
          company,
          role,
          interaction_type,
          interaction_date,
          interaction_method
        ) VALUES (
          student_id,
          contact_names[floor(random() * array_length(contact_names, 1) + 1)],
          company_names[floor(random() * array_length(company_names, 1) + 1)],
          position_titles[floor(random() * array_length(position_titles, 1) + 1)],
          int_type,
          month_date + (floor(random() * 28 + 1))::integer,
          int_method
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Re-enable notification triggers
ALTER TABLE tasks ENABLE TRIGGER on_task_creation;
ALTER TABLE tasks ENABLE TRIGGER on_task_field_update;