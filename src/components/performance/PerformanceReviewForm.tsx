import React, { useState, useEffect } from 'react';
import { createPerformanceReview } from '../../lib/supabase';
import { useToastStore } from '../../stores/useToastStore';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ResumeVersionsPanel } from './ResumeVersionsPanel';
import { AlertCircle } from 'lucide-react';
import type { PerformanceReview, PerformanceIndicators } from '../../types';

interface PerformanceReviewFormProps {
  studentId: string;
  coachId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PerformanceReviewForm({ 
  studentId, 
  coachId, 
  onSuccess, 
  onCancel 
}: PerformanceReviewFormProps) {
  const { addToast } = useToastStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resumeVersions, setResumeVersions] = useState([]);
  const { user } = useAuth();

  const [review, setReview] = useState<Omit<PerformanceReview, 'id' | 'created_at' | 'updated_at'>>({
    student_id: studentId,
    coach_id: coachId,
    review_date: new Date().toISOString().split('T')[0],
    attention_level: 'level_3',
    overall_notes: '',
    resume_quality: 5,
    application_effectiveness: 5,
    behavioral_performance: 5,
    networking_capability: 5,
    technical_proficiency: 5,
    energy_level: 5,
    indicator_notes: {
      resume: '',
      applications: '',
      behavioral: '',
      networking: '',
      technical: '',
      energy: '',
    }
  });

  const loadResumeVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('resume_versions')
        .select('*')
        .eq('student_id', studentId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setResumeVersions(data || []);
    } catch (err) {
      console.error('Error loading resume versions:', err);
      addToast('Failed to load resume versions', 'error');
    }
  };

  useEffect(() => {
    loadResumeVersions();
  }, [studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');

      await createPerformanceReview(review);
      addToast('Performance review submitted successfully', 'success');
      onSuccess();
    } catch (err) {
      console.error('Error submitting performance review:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit performance review');
      addToast('Failed to submit performance review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />

        {/* Panel */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
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

              {/* Review Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900">Review Details</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Review Date
                    </label>
                    <input
                      type="date"
                      value={review.review_date}
                      onChange={(e) => setReview({ ...review, review_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Attention Level
                    </label>
                    <select
                      value={review.attention_level}
                      onChange={(e) => setReview({ ...review, attention_level: e.target.value as any })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="level_1">Level 1 (Highest)</option>
                      <option value="level_2">Level 2 (High)</option>
                      <option value="level_3">Level 3 (Medium)</option>
                      <option value="level_4">Level 4 (Low)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Performance Indicators */}
              <div>
                <h3 className="text-lg font-medium text-gray-900">Performance Indicators</h3>
                <div className="mt-4 space-y-4">
                  {/* Resume Quality */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Resume Quality (10%)
                      </label>
                      <span className="text-sm text-gray-500">{review.resume_quality}/5</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={review.resume_quality}
                      onChange={(e) => setReview({
                        ...review,
                        resume_quality: parseInt(e.target.value)
                      })}
                      className="mt-1 w-full"
                    />
                    <textarea
                      value={review.indicator_notes.resume}
                      onChange={(e) => setReview({
                        ...review,
                        indicator_notes: { ...review.indicator_notes, resume: e.target.value }
                      })}
                      placeholder="Notes on resume quality..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Application Effectiveness */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Application Effectiveness (10%)
                      </label>
                      <span className="text-sm text-gray-500">{review.application_effectiveness}/5</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={review.application_effectiveness}
                      onChange={(e) => setReview({
                        ...review,
                        application_effectiveness: parseInt(e.target.value)
                      })}
                      className="mt-1 w-full"
                    />
                    <textarea
                      value={review.indicator_notes.applications}
                      onChange={(e) => setReview({
                        ...review,
                        indicator_notes: { ...review.indicator_notes, applications: e.target.value }
                      })}
                      placeholder="Notes on application effectiveness..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Behavioral Performance */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Behavioral Interview Performance (10%)
                      </label>
                      <span className="text-sm text-gray-500">{review.behavioral_performance}/5</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={review.behavioral_performance}
                      onChange={(e) => setReview({
                        ...review,
                        behavioral_performance: parseInt(e.target.value)
                      })}
                      className="mt-1 w-full"
                    />
                    <textarea
                      value={review.indicator_notes.behavioral}
                      onChange={(e) => setReview({
                        ...review,
                        indicator_notes: { ...review.indicator_notes, behavioral: e.target.value }
                      })}
                      placeholder="Notes on behavioral performance..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Networking Capability */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Networking Capability (20%)
                      </label>
                      <span className="text-sm text-gray-500">{review.networking_capability}/5</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={review.networking_capability}
                      onChange={(e) => setReview({
                        ...review,
                        networking_capability: parseInt(e.target.value)
                      })}
                      className="mt-1 w-full"
                    />
                    <textarea
                      value={review.indicator_notes.networking}
                      onChange={(e) => setReview({
                        ...review,
                        indicator_notes: { ...review.indicator_notes, networking: e.target.value }
                      })}
                      placeholder="Notes on networking capability..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Technical Proficiency */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Technical Proficiency (30%)
                      </label>
                      <span className="text-sm text-gray-500">{review.technical_proficiency}/5</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={review.technical_proficiency}
                      onChange={(e) => setReview({
                        ...review,
                        technical_proficiency: parseInt(e.target.value)
                      })}
                      className="mt-1 w-full"
                    />
                    <textarea
                      value={review.indicator_notes.technical}
                      onChange={(e) => setReview({
                        ...review,
                        indicator_notes: { ...review.indicator_notes, technical: e.target.value }
                      })}
                      placeholder="Notes on technical proficiency..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Energy/Engagement Level */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Energy/Engagement Level (20%)
                      </label>
                      <span className="text-sm text-gray-500">{review.energy_level}/5</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={review.energy_level}
                      onChange={(e) => setReview({
                        ...review,
                        energy_level: parseInt(e.target.value)
                      })}
                      className="mt-1 w-full"
                    />
                    <textarea
                      value={review.indicator_notes.energy}
                      onChange={(e) => setReview({
                        ...review,
                        indicator_notes: { ...review.indicator_notes, energy: e.target.value }
                      })}
                      placeholder="Notes on energy/engagement level..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Overall Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Overall Notes
                </label>
                <textarea
                  value={review.overall_notes}
                  onChange={(e) => setReview({ ...review, overall_notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows={4}
                  placeholder="Add any overall notes, observations, or recommendations..."
                />
              </div>
            </div>

            {/* Resume Versions Panel */}
            <div className="mt-8">
              <ResumeVersionsPanel
                versions={resumeVersions}
                onUpdate={loadResumeVersions}
                isStaff={user?.role !== 'student'}
              />
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
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}