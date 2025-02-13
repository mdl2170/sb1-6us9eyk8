import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/useToastStore';
import { Trash2 } from 'lucide-react';
import { parseJobUrl } from '../../lib/jobParsing';

interface JobApplication {
  id: string;
  company_name: string;
  position_title: string;
  application_date: string;
  source: string;
  status: string;
  requirements_match: number;
  job_description: string;
  salary_range: any;
  company_size: string;
  location: string;
  work_type: string;
  application_url: string;
  company_url: string;
  last_contact_date: string;
  next_follow_up: string;
  notes: string;
}

interface ApplicationFormProps {
  application?: JobApplication | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ApplicationForm({ application, onSave, onCancel }: ApplicationFormProps) {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [isPopulating, setIsPopulating] = useState(false);
  const [formData, setFormData] = useState<Partial<JobApplication>>(
    application || {
      status: 'draft',
      application_date: new Date().toISOString().split('T')[0]
    }
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, application_url: url }));
    setIsPopulating(true);

    if (url && url.includes('linkedin.com/jobs/')) {
      try {
        const jobData = await parseJobUrl(url);
        // Only update fields that are empty or if we have new data
        setFormData(prev => ({
          ...prev,
          company_name: prev.company_name || jobData.company_name || '',
          position_title: prev.position_title || jobData.position_title || '',
          company_size: prev.company_size || jobData.company_size || '',
          location: prev.location || jobData.location || '',
          job_description: prev.job_description || jobData.job_description || '',
          company_url: prev.company_url || jobData.company_url || '',
          work_type: prev.work_type || jobData.work_type || ''
        }));
      } catch (error) {
        console.error('Error parsing job URL:', error);
        addToast(
          error instanceof Error ? error.message : 'Failed to parse job details. Please enter details manually.',
          'error'
        );
      } finally {
        setIsPopulating(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const applicationData = {
        ...formData,
        student_id: user.id,
        updated_at: new Date().toISOString()
      };

      if (application) {
        // Update existing application
        const { error } = await supabase
          .from('job_applications')
          .update(applicationData)
          .eq('id', application.id);

        if (error) throw error;

        // Add status history if status changed
        if (application.status !== formData.status) {
          const { error: historyError } = await supabase
            .from('application_status_history')
            .insert([{
              application_id: application.id,
              status: formData.status,
              notes: formData.notes
            }]);

          if (historyError) throw historyError;
        }
      } else {
        // Create new application
        const { data, error } = await supabase
          .from('job_applications')
          .insert([applicationData])
          .select()
          .single();

        if (error) throw error;

        // Add initial status history
        const { error: historyError } = await supabase
          .from('application_status_history')
          .insert([{
            application_id: data.id,
            status: data.status,
            notes: data.notes
          }]);

        if (historyError) throw historyError;
      }

      addToast(
        `Application ${application ? 'updated' : 'created'} successfully`,
        'success'
      );
      onSave();
    } catch (error) {
      console.error('Error saving application:', error);
      addToast(
        `Failed to ${application ? 'update' : 'create'} application`,
        'error'
      );
    }
  };

  const handleDelete = async () => {
    if (!user || !application) return;
    
    if (!window.confirm('Are you sure you want to delete this application and all related history? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete application status history first
      const { error: historyError } = await supabase
        .from('application_status_history')
        .delete()
        .eq('application_id', application.id);

      if (historyError) throw historyError;

      // Delete the application
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', application.id)
        .eq('student_id', user.id);

      if (error) throw error;

      addToast('Application deleted successfully', 'success');
      onSave();
      onCancel();
    } catch (error) {
      console.error('Error deleting application:', error);
      addToast('Failed to delete application', 'error');
    } finally {
      setIsDeleting(false);
    } 
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {application ? 'Edit Application' : 'New Application'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {application
                ? 'Update the details of your job application'
                : 'Enter the details of your new job application'}
            </p>
          </div>

          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Quick Application Entry</h4>
                  <p className="text-sm text-blue-700 mb-4">
                    Enter a LinkedIn job URL below and we'll automatically populate the job details for you.
                  </p>
                  <div className="relative">
                    <input
                      type="url"
                      value={formData.application_url || ''}
                      onChange={handleUrlChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="https://www.linkedin.com/jobs/view/..."
                    />
                    {isPopulating && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.company_name || ''}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Position Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.position_title || ''}
                  onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Application Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.application_date || ''}
                  onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  required
                  value={formData.status || 'draft'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="draft">Draft</option>
                  <option value="applied">Applied</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Company Size
                </label>
                <select
                  value={formData.company_size || ''}
                  onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
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

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Work Type
                </label>
                <select
                  value={formData.work_type || ''}
                  onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select type</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </div>

              <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., New York, NY or Remote - US"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Company URL
                </label>
                <input
                  type="url"
                  value={formData.company_url || ''}
                  onChange={(e) => setFormData({ ...formData, company_url: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="https://..."
                />
              </div>

              <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Job Description
                </label>
                <textarea
                  rows={4}
                  value={formData.job_description || ''}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={4}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Add any notes about your application, interviews, or follow-ups..."
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Last Contact Date
                </label>
                <input
                  type="date"
                  value={formData.last_contact_date || ''}
                  onChange={(e) => setFormData({ ...formData, last_contact_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Next Follow-up
                </label>
                <input
                  type="date"
                  value={formData.next_follow_up || ''}
                  onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        {application && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete Application'}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {application ? 'Update' : 'Create'} Application
        </button>
      </div>
    </form>
  );
}