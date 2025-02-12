@@ .. @@
 -- Add unique constraint for student_id and week_start_date
+DROP INDEX IF EXISTS weekly_progress_reviews_student_week_key;
+DROP INDEX IF EXISTS weekly_progress_reviews_student_week_idx;
+
 ALTER TABLE weekly_progress_reviews
-ADD CONSTRAINT weekly_progress_reviews_student_week_key 
-UNIQUE (student_id, week_start_date);
+ADD CONSTRAINT weekly_progress_reviews_pkey PRIMARY KEY (id);
+
+CREATE UNIQUE INDEX weekly_progress_reviews_student_week_idx 
+ON weekly_progress_reviews (student_id, week_start_date);
 
 -- Grant execute permissions
 GRANT EXECUTE ON FUNCTION generate_weekly_progress_review(uuid, date) TO authenticated;
 GRANT EXECUTE ON FUNCTION update_weekly_progress_reviews(uuid, date, date) TO authenticated;