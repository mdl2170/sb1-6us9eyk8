import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToastStore } from '../stores/useToastStore';
import { useSelectedStudentStore } from '../stores/useSelectedStudentStore';
import { fetchStudentPerformance, supabase } from '../lib/supabase';
import { SearchableSelect } from '../components/SearchableSelect';
import { PerformanceOverview } from '../components/performance/PerformanceOverview';
import { PerformanceReviewForm } from '../components/performance/PerformanceReviewForm';
import { PerformanceMetrics } from '../components/performance/PerformanceMetrics';
import { OfficeHoursRecordForm } from '../components/performance/OfficeHoursRecord';
import { MockInterviewForm } from '../components/performance/MockInterviewForm';
import { deleteMockInterview, deleteOfficeHoursRecord } from '../lib/supabase';
import type { StudentPerformance } from '../types';

export function PerformanceReview() {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [students, setStudents] = useState<{ value: string; label: string }[]>([]);
  const { selectedStudent, setSelectedStudent } = useSelectedStudentStore();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [performance, setPerformance] = useState<StudentPerformance | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showOfficeHoursForm, setShowOfficeHoursForm] = useState(false);
  const [showMockInterviewForm, setShowMockInterviewForm] = useState(false);
  const [editingMockInterview, setEditingMockInterview] = useState<MockInterview | null>(null);
  const [editingOfficeHours, setEditingOfficeHours] = useState<OfficeHoursRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleDeleteMockInterview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mock interview record? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete the mock interview from the database
      await deleteMockInterview(id);
      
      // Update the local state to remove the deleted interview
      if (performance) {
        setPerformance({
          ...performance,
          mock_interviews: performance.mock_interviews.filter(interview => interview.id !== id)
        });
      }
      
      addToast('Mock interview deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting mock interview:', err);
      addToast('Failed to delete mock interview', 'error');
    }
  };

  const handleDeleteOfficeHours = async (id: string) => {
    if (!confirm('Are you sure you want to delete this office hours record? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteOfficeHoursRecord(id);
      addToast('Office hours record deleted successfully', 'success');
      // Update the local state to remove the deleted record
      if (performance) {
        setPerformance({
          ...performance,
          office_hours: performance.office_hours.filter(record => record.id !== id)
        });
      }
    } catch (err) {
      console.error('Error deleting office hours record:', err);
      addToast('Failed to delete office hours record', 'error');
    }
  };

  // Load students for staff members
  useEffect(() => {
    if (user?.role !== 'student') {
      const loadStudents = async () => {
        try {
          let query = supabase
            .from('students')
            .select(`
              id,
              profile:profiles!students_id_fkey(
                id,
                full_name
              )
            `)
            .order('profile(full_name)');

          // If user is a coach, only show their students
          if (user.role === 'coach') {
            query = query.eq('coach_id', user.id);
          }

          const { data, error } = await query;

          if (error) throw error;
          setStudents(
            (data || []).map(student => ({
              value: student.id, 
              label: student.profile.full_name
            }))
          );
        } catch (err) {
          console.error('Error loading students:', err);
          addToast('Failed to load students', 'error');
        }
      };

      loadStudents();
    }
  }, [user]);

  // Load performance data when student is selected or for student users
  useEffect(() => {
    if (user?.role === 'student') {
      loadPerformanceData(user.id);
    } else if (selectedStudent) {
      loadPerformanceData(selectedStudent);
    }
  }, [user, selectedStudent, selectedMonth]);

  const loadPerformanceData = async (studentId: string) => {
    try {
      setIsLoading(true);
      const data = await fetchStudentPerformance(studentId, selectedMonth);
            
      setPerformance(data);
    } catch (err) {
      console.error('Error loading performance data:', err);
      addToast('Failed to load performance data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 -mt-8 -mx-8 -mb-8">
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Performance Review</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track and evaluate student performance and progress
        </p>

        {user?.role !== 'student' && (
          <div className="bg-white shadow rounded-lg mt-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Please select a student</h2>
              <p className="mt-1 text-sm text-gray-500">
                Choose a student from the dropdown below to view their performance
              </p>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <SearchableSelect
                  options={students}
                  value={selectedStudent || ''}
                  onChange={setSelectedStudent}
                  placeholder="Select student..."
                  className="w-64"
                />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    loadPerformanceData(selectedStudent || '');
                  }}
                  className="w-64 cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-left focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : !performance ? (
          <div className="text-center py-12">
            <h2 className="text-lg font-medium text-gray-900">No performance data available</h2>
            <p className="mt-2 text-sm text-gray-500">Please contact your coach or administrator.</p>
          </div>
        ) : (user?.role === 'student' || selectedStudent) ? (
          <>
            <PerformanceOverview
              performance={performance}
              onCreateReview={() => setShowReviewForm(true)}
              selectedMonth={selectedMonth}
              onUpdate={() => loadPerformanceData(user?.role === 'student' ? user.id : selectedStudent || '')}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Performance Metrics */}
              <PerformanceMetrics
                studentId={user?.role === 'student' ? user.id : selectedStudent || ''}
              />
              {/* Resume Versions */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Resume Versions</h2>
                </div>
                {performance.resume_versions.length > 0 ? (
                  <div className="space-y-4">
                    {performance.resume_versions.map((version) => (
                      <div key={version.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              Version {version.version_number}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(version.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            version.status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : version.status === 'under_review'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {version.status.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </span>
                        </div>
                        {version.file_url && (
                          <a
                            href={version.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                          >
                            View Resume
                          </a>
                        )}
                        {version.feedback && (
                          <div className="mt-2">
                            <h4 className="text-xs font-medium text-gray-700">Feedback:</h4>
                            <p className="mt-1 text-sm text-gray-600">{version.feedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No resume versions uploaded yet.</p>
                )}
              </div>
            </div>
      
            {/* Mock Interviews and Office Hours Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Mock Interviews Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Mock Interviews</h2>
                  {user && ['admin', 'coach', 'mentor'].includes(user.role) && (
                    <button
                      onClick={() => setShowMockInterviewForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Add Mock Interview
                    </button>
                  )}
                </div>
                {performance?.mock_interviews && performance.mock_interviews.length > 0 ? (
                  <div className="space-y-4">
                    {performance.mock_interviews.map((interview) => (
                      <div key={interview.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-medium text-gray-900">
                              {interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1)} Interview
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(interview.interview_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Score: {interview.overall_rating}/10
                            </span>
                            {user && ['admin', 'coach', 'mentor'].includes(user.role) && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMockInterview(interview);
                                    setShowMockInterviewForm(true);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMockInterview(interview.id);
                                  }}
                                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {interview.strengths && interview.strengths.length > 0 && (
                          <div className="mt-2">
                            <h4 className="text-xs font-medium text-gray-700">Strengths:</h4>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {interview.strengths.map((strength, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                >
                                  {strength}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {interview.areas_for_improvement && interview.areas_for_improvement.length > 0 && (
                          <div className="mt-2">
                            <h4 className="text-xs font-medium text-gray-700">Areas for Improvement:</h4>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {interview.areas_for_improvement.map((area, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {interview.recording_url && (
                          <a
                            href={interview.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                          >
                            View Recording
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No mock interviews recorded yet.</p>
                )}
              </div>

              {/* Office Hours Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Office Hours</h2>
                  {user && ['admin', 'coach', 'mentor'].includes(user.role) && (
                    <button
                      onClick={() => setShowOfficeHoursForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Add Office Hours
                    </button>
                  )}
                </div>
                {performance?.office_hours && performance.office_hours.length > 0 ? (
                  <div className="space-y-4">
                    {performance.office_hours.map((session) => (
                      <div key={session.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-medium text-gray-900">
                              {new Date(session.session_date).toLocaleDateString()}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Duration: {session.duration_minutes} minutes
                            </p>
                          </div>
                          {user && ['admin', 'coach', 'mentor'].includes(user.role) && (
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingOfficeHours(session);
                                  setShowOfficeHoursForm(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOfficeHours(session.id);
                                }}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                        {session.recording_url && (
                          <a
                            href={session.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                          >
                            View Recording
                          </a>
                        )}
                        {session.topics_covered && session.topics_covered.length > 0 && (
                          <div className="mt-2">
                            <h4 className="text-xs font-medium text-gray-700">Topics Covered:</h4>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {session.topics_covered.map((topic, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No office hours recorded yet.</p>
                )}
              </div>
            </div>

            {showReviewForm && (
              <PerformanceReviewForm
                studentId={user?.role === 'student' ? user.id : selectedStudent || ''}
                coachId={performance.coach?.id || ''}
                onSuccess={() => {
                  setShowReviewForm(false);
                  loadPerformanceData(user?.role === 'student' ? user.id : selectedStudent || '');
                }}
                onCancel={() => setShowReviewForm(false)}
              />
            )}

            {showOfficeHoursForm && (
              <OfficeHoursRecordForm
                studentId={user?.role === 'student' ? user.id : selectedStudent || ''}
                coachId={user?.id || ''} 
                onSuccess={() => {
                  setShowOfficeHoursForm(false);
                  loadPerformanceData(user?.role === 'student' ? user.id : selectedStudent || '');
                }}
                onCancel={() => setShowOfficeHoursForm(false)}
              />
            )}

            {showMockInterviewForm && (
              <MockInterviewForm
                studentId={user?.role === 'student' ? user.id : selectedStudent || ''}
                initialData={editingMockInterview}
                onSuccess={() => {
                  setShowMockInterviewForm(false);
                  setEditingMockInterview(null);
                  loadPerformanceData(user?.role === 'student' ? user.id : selectedStudent || '');
                }}
                onCancel={() => {
                  setShowMockInterviewForm(false);
                  setEditingMockInterview(null);
                }}
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}