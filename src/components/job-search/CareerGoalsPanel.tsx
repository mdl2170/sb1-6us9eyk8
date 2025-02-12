import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/useToastStore';
import {
  Target,
  Briefcase,
  Building,
  Building2,
  Users,
  MapPin,
  Calendar,
  CalendarPlus,
  CalendarCheck,
  FileText,
  Video,
  CalendarClock
} from 'lucide-react';
import { SuggestiveSelect } from '../SuggestiveSelect';

const TARGET_ROLES_SUGGESTIONS = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Product Manager',
  'UX Designer',
  'UI Designer',
  'Instructional Designer',
  'Project Manager',
  'Business Analyst',
  'Quality Assurance Engineer',
  'Technical Writer'
];

const TARGET_INDUSTRIES_SUGGESTIONS = [
  'Higher Education',
  'Technology',
  'Healthcare',
  'Financial Services',
  'E-commerce',
  'Consulting',
  'Manufacturing',
  'Retail',
  'Media & Entertainment',
  'Telecommunications',
  'Energy',
  'Transportation',
  'Real Estate',
  'Non-profit'
];

interface CareerGoal {
  id: string;
  target_roles: string[];
  target_industries: string[];
  preferred_company_size: string[];
  preferred_location: string;
  geographic_preferences: string[];
  weekly_application_goal: number;
  quality_match_target: number;
  campaign_start_date: string;
  campaign_end_date: string;
  job_boards: string[];
  target_companies: string[];
  weekly_connection_goal: number;
  weekly_interview_goal: number;
  weekly_event_goal: number;
  monthly_alumni_goal: number;
  monthly_industry_goal: number;
  monthly_recruiter_goal: number;
}

export function CareerGoalsPanel() {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [goals, setGoals] = useState<CareerGoal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CareerGoal>>(
    goals || {
      target_roles: [],
      target_industries: [],
      weekly_application_goal: 5,
      weekly_connection_goal: 5,
      weekly_interview_goal: 2,
      weekly_event_goal: 1,
      monthly_alumni_goal: 3,
      monthly_industry_goal: 5,
      monthly_recruiter_goal: 3
    }
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCareerGoals();
  }, [user?.id]);

  async function loadCareerGoals() {
    try {
      const { data, error } = await supabase
        .from('career_goals')
        .select('*')
        .eq('student_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      setGoals(data);
      setFormData(data || {
        target_roles: [],
        target_industries: [],
        weekly_application_goal: 5,
        weekly_connection_goal: 5,
        weekly_interview_goal: 2,
        weekly_event_goal: 1,
        monthly_alumni_goal: 3,
        monthly_industry_goal: 5,
        monthly_recruiter_goal: 3
      });
    } catch (error) {
      console.error('Error loading career goals:', error);
      addToast('Failed to load career goals', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      const goalData = {
        ...formData,
        student_id: user.id
      };

      const { error } = goals
        ? await supabase
            .from('career_goals')
            .update(goalData)
            .eq('id', goals.id)
        : await supabase
            .from('career_goals')
            .insert([goalData]);

      if (error) throw error;

      addToast('Career goals saved successfully', 'success');
      setIsEditing(false);
      loadCareerGoals();
    } catch (error) {
      console.error('Error saving career goals:', error);
      addToast('Failed to save career goals', 'error');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Career Goals</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {isEditing ? 'Cancel' : 'Edit Goals'}
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Target Roles */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Target Roles (up to 3)
              </label>
              <SuggestiveSelect
                value={formData.target_roles?.join(', ') || ''}
                suggestions={TARGET_ROLES_SUGGESTIONS}
                onChange={(value) => setFormData({
                  ...formData,
                  target_roles: value.split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
                    .slice(0, 3)
                })}
                placeholder="Enter up to 3 roles, separated by commas"
                maxItems={3}
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.target_roles?.length || 0}/3 roles selected
              </p>
            </div>

            {/* Target Industries */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Target Industries (up to 3)
              </label>
              <SuggestiveSelect
                value={formData.target_industries?.join(', ') || ''}
                suggestions={TARGET_INDUSTRIES_SUGGESTIONS}
                onChange={(value) => setFormData({
                  ...formData,
                  target_industries: value.split(',')
                    .map(s => s.trim())
                    .filter(Boolean)
                    .slice(0, 3)
                })}
                placeholder="Enter up to 3 industries, separated by commas"
                maxItems={3}
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.target_industries?.length || 0}/3 industries selected
              </p>
            </div>

            {/* Company Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Preferred Company Size
              </label>
              <select
                value={formData.preferred_company_size?.[0] || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  preferred_company_size: [e.target.value]
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select size</option>
                <option value="startup">Startup</option>
                <option value="small">Small</option>
                <option value="midsize">Midsize</option>
                <option value="large">Large</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Work Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Preferred Work Location
              </label>
              <select
                value={formData.preferred_location || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  preferred_location: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select location</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>

            {/* Campaign Dates */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Campaign Start Date
              </label>
              <input
                type="date"
                value={formData.campaign_start_date || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  campaign_start_date: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Campaign End Date
              </label>
              <input
                type="date"
                value={formData.campaign_end_date || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  campaign_end_date: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            {/* Weekly Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Weekly Application Goal
              </label>
              <input
                type="number"
                min="0"
                value={formData.weekly_application_goal || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  weekly_application_goal: parseInt(e.target.value)
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Weekly Connection Goal
              </label>
              <input
                type="number"
                min="0"
                value={formData.weekly_connection_goal || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  weekly_connection_goal: parseInt(e.target.value)
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Save Goals
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Main Goals Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Target Roles */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Target className="h-5 w-5 text-indigo-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Target Roles</h3>
              </div>
              {goals ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <ul className="space-y-2">
                      {goals.target_roles.map((role, index) => (
                        <li key={index} className="flex items-center bg-indigo-50 text-indigo-700 px-3 py-2 rounded-md">
                          <Briefcase className="h-4 w-4 mr-2 text-indigo-500" />
                          {role}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No target roles set</p>
              )}
            </div>

            {/* Target Industries */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Building2 className="h-5 w-5 text-indigo-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Target Industries</h3>
              </div>
              {goals ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <ul className="space-y-2">
                      {goals.target_industries.map((industry, index) => (
                        <li key={index} className="flex items-center bg-indigo-50 text-indigo-700 px-3 py-2 rounded-md">
                          <Building className="h-4 w-4 mr-2 text-indigo-500" />
                          {industry}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No target industries set</p>
              )}
            </div>
          </div>

          {/* Company Preferences and Campaign Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Preferences */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Building2 className="h-5 w-5 text-indigo-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Company Preferences</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Size</h4>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-900 capitalize">
                      {goals?.preferred_company_size?.[0] || 'Not specified'}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Location</h4>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-900 capitalize">
                      {goals?.preferred_location || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Calendar className="h-5 w-5 text-indigo-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Campaign Timeline</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Start Date</h4>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-900">
                      {goals?.campaign_start_date ? new Date(goals.campaign_start_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">End Date</h4>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-900">
                      {goals?.campaign_end_date ? new Date(goals.campaign_end_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Goals */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Target className="h-5 w-5 text-indigo-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Weekly Goals</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Applications</h4>
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-2xl font-semibold text-indigo-600">
                    {goals?.weekly_application_goal || 0}
                  </p>
                  <p className="text-sm text-gray-500">per week</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Connections</h4>
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-2xl font-semibold text-indigo-600">
                    {goals?.weekly_connection_goal || 0}
                  </p>
                  <p className="text-sm text-gray-500">per week</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Interviews</h4>
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-2xl font-semibold text-indigo-600">
                    {goals?.weekly_interview_goal || 0}
                  </p>
                  <p className="text-sm text-gray-500">per week</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Events</h4>
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-2xl font-semibold text-indigo-600">
                    {goals?.weekly_event_goal || 0}
                  </p>
                  <p className="text-sm text-gray-500">per week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}