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
  created_by: string;
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
  parent_id?: string;
  order: number;
  created_by: string;
  created_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
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

export type AttentionLevel = 'level_1' | 'level_2' | 'level_3' | 'level_4';
export type PerformanceRating = 'outstanding' | 'medium' | 'red_flag';
export type InterviewType = 'technical' | 'behavioral';
export type ResumeStatus = 'draft' | 'under_review' | 'approved';

export type PerformanceReview = {
  id: string;
  student_id: string;
  review_date: string;
  attention_level: AttentionLevel;
  performance_rating: PerformanceRating;
  overall_notes?: string;
  coach_id: string;
  created_at: string;
  updated_at: string;
};

export type PerformanceIndicators = {
  id: string;
  review_id: string;
  resume_quality?: number;
  application_effectiveness?: number;
  behavioral_performance?: number;
  networking_capability?: number;
  technical_proficiency?: number;
  energy_level?: number;
  notes?: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type OfficeHoursRecord = {
  id: string;
  student_id: string;
  coach_id: string;
  session_date: string;
  duration_minutes: number;
  recording_url?: string;
  meeting_notes?: string;
  topics_covered: string[];
  action_items: string[];
  created_at: string;
  updated_at: string;
};

export type MockInterview = {
  id: string;
  student_id: string;
  interviewer_id: string;
  interview_date: string;
  interview_type: InterviewType;
  recording_url?: string;
  overall_rating?: number;
  strengths: string[];
  areas_for_improvement: string[];
  evaluation_notes?: string;
  worksheet_completion_status?: string;
  created_at: string;
  updated_at: string;
};

export type ResumeVersion = {
  id: string;
  student_id: string;
  version_number: number;
  file_url: string;
  feedback?: string;
  reviewed_by?: string;
  status: ResumeStatus;
  created_at: string;
  updated_at: string;
};

export type StudentPerformance = {
  student: Profile & {
    attention_level?: AttentionLevel;
    performance_rating?: PerformanceRating;
    last_review_date?: string;
  };
  coach?: Profile;
  mentor?: Profile;
  latest_review?: PerformanceReview & {
    indicators?: PerformanceIndicators;
  };
  mock_interviews: MockInterview[];
  office_hours: OfficeHoursRecord[];
  resume_versions: ResumeVersion[];
};

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

export interface StudentPerformance {
  student: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    attention_level: string;
    performance_rating: string;
    last_review_date: string;
  };
  coach?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  mentor?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  latest_review?: PerformanceReview & {
    indicators: PerformanceIndicators;
  };
  mock_interviews: MockInterview[];
  office_hours: OfficeHoursRecord[];
  resume_versions: ResumeVersion[];
}

export interface PerformanceReview {
  id: string;
  student_id: string;
  review_date: string;
  attention_level: string;
  performance_rating: string;
  overall_notes: string;
  coach_id: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceIndicators {
  id: string;
  review_id: string;
  resume_quality: number;
  application_effectiveness: number;
  behavioral_performance: number;
  networking_capability: number;
  technical_proficiency: number;
  energy_level: number;
  notes: {
    resume: string;
    applications: string;
    behavioral: string;
    networking: string;
    technical: string;
    energy: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PerformanceMetrics {
  application_rate: number;
  application_goal: number;
  response_rate: number;
  interview_rate: number;
  technical_readiness: number;
  behavioral_readiness: number;
  resume_quality: number;
}

export interface PerformanceAlert {
  id: string;
  student_id: string;
  alert_type: string;
  severity: string;
  message: string;
  metrics: any;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
}

export interface OfficeHoursRecord {
  id: string;
  student_id: string;
  coach_id: string;
  session_date: string;
  duration_minutes: number;
  recording_url?: string;
  meeting_notes?: string;
  topics_covered: string[];
  action_items: string[];
  created_at: string;
  updated_at: string;
}

export interface MockInterview {
  id: string;
  student_id: string;
  interviewer_id: string;
  interview_date: string;
  interview_type: 'technical' | 'behavioral';
  recording_url?: string;
  overall_rating: number;
  strengths: string[];
  areas_for_improvement: string[];
  evaluation_notes?: string;
  worksheet_completion_status: string;
  created_at: string;
  updated_at: string;
}

export interface ResumeVersion {
  id: string;
  student_id: string;
  version_number: number;
  file_url: string;
  feedback?: string;
  reviewed_by?: string;
  status: 'draft' | 'under_review' | 'approved';
  created_at: string;
  updated_at: string;
}