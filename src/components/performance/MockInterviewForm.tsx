import React, { useState } from 'react';
import { createMockInterview, updateMockInterview, supabase } from '../../lib/supabase';
import { useToastStore } from '../../stores/useToastStore';
import { AlertCircle, Video, Plus, X } from 'lucide-react';
import { SearchableSelect } from '../SearchableSelect';
import { useAuth } from '../../hooks/useAuth';

interface MockInterviewFormProps {
  studentId: string;
  initialData?: MockInterview | null;
  interviewerId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MockInterviewForm({
  studentId,
  initialData,
  interviewerId,
  onSuccess,
  onCancel
}: MockInterviewFormProps) {
  const { addToast } = useToastStore();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [interviewers, setInterviewers] = useState<{ value: string; label: string }[]>([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState(interviewerId || '');

  // Load available interviewers
  React.useEffect(() => {
    const loadInterviewers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['coach', 'mentor', 'admin'])
          .eq('status', 'active')
          .order('full_name');

        if (error) throw error;
        
        setInterviewers(
          data.map(user => ({
            value: user.id,
            label: user.full_name
          }))
        );

        // Set current user as interviewer if they're staff
        if (!interviewerId && user && ['coach', 'mentor', 'admin'].includes(user.role)) {
          setSelectedInterviewer(user.id);
        }
      } catch (err) {
        console.error('Error loading interviewers:', err);
        addToast('Failed to load interviewers', 'error');
      }
    };
    loadInterviewers();
  }, [user, interviewerId]);

  const [interview, setInterview] = useState<Omit<MockInterview, 'id' | 'created_at' | 'updated_at'>>(initialData || {
    student_id: studentId,
    interviewer_id: selectedInterviewer,
    interview_date: new Date().toISOString(),
    interview_type: 'technical',
    recording_url: '',
    overall_rating: 5,
    strengths: [],
    areas_for_improvement: [],
    evaluation_notes: '',
    worksheet_completion_status: 'not_started',
  });

  const [newStrength, setNewStrength] = useState('');
  const [newArea, setNewArea] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedInterviewer) {
      setError('Please select an interviewer');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');

      if (initialData) {
        await updateMockInterview(initialData.id, interview);
        addToast('Mock interview updated successfully', 'success');
      } else {
        await createMockInterview({
          ...interview,
          interviewer_id: selectedInterviewer
        });
        addToast('Mock interview created successfully', 'success');
      }
      onSuccess();
    } catch (err) {
      console.error('Error creating mock interview record:', err);
      setError(err instanceof Error ? err.message : 'Failed to create mock interview record');
      addToast('Failed to create mock interview record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addStrength = () => {
    if (newStrength.trim()) {
      setInterview({
        ...interview,
        strengths: [...interview.strengths, newStrength.trim()],
      });
      setNewStrength('');
    }
  };

  const removeStrength = (index: number) => {
    setInterview({
      ...interview,
      strengths: interview.strengths.filter((_, i) => i !== index),
    });
  };

  const addArea = () => {
    if (newArea.trim()) {
      setInterview({
        ...interview,
        areas_for_improvement: [...interview.areas_for_improvement, newArea.trim()],
      });
      setNewArea('');
    }
  };

  const removeArea = (index: number) => {
    setInterview({
      ...interview,
      areas_for_improvement: interview.areas_for_improvement.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />

        {/* Panel */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Interview Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900">Interview Details</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Interview Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={interview.interview_date.slice(0, 16)}
                      onChange={(e) => setInterview({ ...interview, interview_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Interview Type
                    </label>
                    <select
                      value={interview.interview_type}
                      onChange={(e) => setInterview({ ...interview, interview_type: e.target.value as 'technical' | 'behavioral' })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="technical">Technical</option>
                      <option value="behavioral">Behavioral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Interviewer
                    </label>
                    <SearchableSelect
                      options={interviewers}
                      value={selectedInterviewer}
                      onChange={setSelectedInterviewer}
                      placeholder="Select interviewer..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Recording URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Recording URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    <Video className="h-4 w-4" />
                  </span>
                  <input
                    type="url"
                    value={interview.recording_url}
                    onChange={(e) => setInterview({ ...interview, recording_url: e.target.value })}
                    placeholder="https://..."
                    className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Overall Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Overall Rating
                </label>
                <div className="mt-1 flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={interview.overall_rating}
                    onChange={(e) => setInterview({ ...interview, overall_rating: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {interview.overall_rating}/10
                  </span>
                </div>
              </div>

              {/* Strengths */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Strengths
                </label>
                <div className="mt-1">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newStrength}
                      onChange={(e) => setNewStrength(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStrength())}
                      placeholder="Add a strength..."
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={addStrength}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {interview.strengths.map((strength, index) => (
                      <div key={index} className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-md">
                        <span className="text-sm text-green-700">{strength}</span>
                        <button
                          type="button"
                          onClick={() => removeStrength(index)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Areas for Improvement */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Areas for Improvement
                </label>
                <div className="mt-1">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArea())}
                      placeholder="Add an area for improvement..."
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={addArea}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {interview.areas_for_improvement.map((area, index) => (
                      <div key={index} className="flex items-center justify-between bg-yellow-50 px-3 py-2 rounded-md">
                        <span className="text-sm text-yellow-700">{area}</span>
                        <button
                          type="button"
                          onClick={() => removeArea(index)}
                          className="text-yellow-600 hover:text-yellow-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Evaluation Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Evaluation Notes
                </label>
                <textarea
                  value={interview.evaluation_notes}
                  onChange={(e) => setInterview({ ...interview, evaluation_notes: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Add detailed evaluation notes..."
                />
              </div>

              {/* Worksheet Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Worksheet Completion Status
                </label>
                <select
                  value={interview.worksheet_completion_status}
                  onChange={(e) => setInterview({ ...interview, worksheet_completion_status: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Interview'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}