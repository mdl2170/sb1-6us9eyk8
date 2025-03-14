/*
  # Add sample data for testing attention level chart
  
  1. Changes
    - Assign coach to 4 random students
    - Generate sample performance reviews for past 12 months
    - Ensure realistic attention level distribution
*/

DO $$
DECLARE
  v_coach_id uuid;
  student_ids uuid[];
  current_date date := CURRENT_DATE;
  review_date date;
  i integer;
  j integer;
  student_id uuid;
  attention attention_level;
  performance performance_rating;
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

  -- Generate performance reviews for past 12 months
  FOR i IN 0..11 LOOP
    review_date := date_trunc('month', current_date - (i || ' months')::interval)::date + 15;
    
    -- For each student
    FOR j IN 1..array_length(student_ids, 1) LOOP
      student_id := student_ids[j];
      
      -- Determine attention level and performance rating based on patterns
      CASE 
        WHEN i < 3 THEN -- Recent months
          attention := CASE floor(random() * 4)::int
            WHEN 0 THEN 'highest'
            WHEN 1 THEN 'high'
            WHEN 2 THEN 'medium'
            ELSE 'low'
          END;
        WHEN i < 6 THEN -- Mid-term
          attention := CASE floor(random() * 3)::int
            WHEN 0 THEN 'high'
            WHEN 1 THEN 'medium'
            ELSE 'low'
          END;
        ELSE -- Earlier months
          attention := CASE floor(random() * 2)::int
            WHEN 0 THEN 'medium'
            ELSE 'low'
          END;
      END CASE;

      -- Set performance rating based on attention level
      performance := CASE attention
        WHEN 'highest' THEN 'red_flag'
        WHEN 'high' THEN 'medium'
        WHEN 'medium' THEN 'medium'
        ELSE 'outstanding'
      END;

      -- Insert performance review
      INSERT INTO performance_reviews (
        student_id,
        coach_id,
        review_date,
        attention_level,
        performance_rating,
        overall_notes,
        resume_quality,
        application_effectiveness,
        behavioral_performance,
        networking_capability,
        technical_proficiency,
        energy_level,
        indicator_notes,
        created_at,
        updated_at
      ) VALUES (
        student_id,
        v_coach_id,
        review_date,
        attention,
        performance,
        'Monthly performance review for ' || to_char(review_date, 'Month YYYY'),
        floor(random() * 3 + 2)::int, -- 2-4
        floor(random() * 3 + 2)::int, -- 2-4
        floor(random() * 3 + 2)::int, -- 2-4
        floor(random() * 3 + 2)::int, -- 2-4
        floor(random() * 3 + 2)::int, -- 2-4
        CASE attention
          WHEN 'highest' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        jsonb_build_object(
          'notes', 'Sample performance indicators for ' || to_char(review_date, 'Month YYYY')
        ),
        review_date + interval '10 hours',
        review_date + interval '10 hours'
      );
    END LOOP;
  END LOOP;
END $$;