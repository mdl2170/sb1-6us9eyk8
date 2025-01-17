export type Priority = 'low' | 'medium' | 'high';
export type Status = 'pending' | 'in_progress' | 'completed';

export interface TaskResource {
  id: string;
  name: string;
  type: 'file' | 'drive';
  url: string;
  size?: number;
  uploaded_at: string;
  uploaded_by: string;
}

export interface TaskGroup {
  id: string;
  title: string;
  color: string;
  order: number;
}

export interface BaseTask {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  assignee?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  resources?: TaskResource[];
}

export type NotificationType = 'task' | 'system' | 'mention' | 'reminder';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Subtask extends BaseTask {
  parentId: string;
}

export interface Task extends BaseTask {
  groupId: string;
  tags: string[];
  subtasks: Subtask[];
}

export type UserRole = 'student' | 'coach' | 'mentor' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'suspended' | 'archived';
}

export interface StudentProfile extends Profile {
  cohort?: string;
  enrollment_date: string;
  program_start_date?: string;
  expected_end_date?: string;
  actual_end_date?: string;
  program_type?: string;
  school?: string;
  school_graduation_date?: string;
  linkedin_url?: string;
  major?: string;
  facebook_url?: string;
  phone?: string;
  timezone?: string;
  student_folder_url?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  status: 'active' | 'inactive' | 'graduated';
  coach_id?: string;
  mentor_id?: string;
  target_role?: string;
  job_search_status?: 'not_started' | 'preparing' | 'actively_searching' | 'interviewing' | 'accepted_offer';
}

export interface CoachProfile extends Profile {
  specialization: string[];
  max_students: number;
}

export interface MentorProfile extends Profile {
  expertise: string[];
  max_mentees: number;
  linkedin_url?: string;
  bio?: string;
  internal_note?: string;
  availability?: { day: string; slots: string[] }[];
  preferred_communication?: string;
  languages?: string[];
  industry_experience?: number;
  company?: string;
  position?: string;
  skills?: string[];
  mentoring_experience?: string;
  mentoring_style?: string;
  expectations?: string;
  achievements?: string[];
  website_url?: string;
  github_url?: string;
}