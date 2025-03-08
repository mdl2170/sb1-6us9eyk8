import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToastStore } from '../stores/useToastStore';
import { fetchStudentPerformance, supabase } from '../lib/supabase';
import { SearchableSelect } from '../components/SearchableSelect';
import { PerformanceOverview } from '../components/performance/PerformanceOverview';
import { PerformanceReviewForm } from '../components/performance/PerformanceReviewForm';
import { PerformanceMetrics } from '../components/performance/PerformanceMetrics';
import { PerformanceAlerts } from '../components/performance/PerformanceAlerts';
import { OfficeHoursRecordForm } from '../components/performance/OfficeHoursRecord';
import { MockInterviewForm } from '../components/performance/MockInterviewForm';
import type { StudentPerformance } from '../types';

export function PerformanceReview() {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [students, setStudents] = useState<{ value: string; label: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [performance, setPerformance] = useState<StudentPerformance | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showOfficeHoursForm, setShowOfficeHoursForm] = useState(false);
  const [showMockInterviewForm, setShowMockInterviewForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load students for staff members
  useEffect(() => {
    if (user?.role !== 'student') {
      const loadStudents = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .order('full_name');

          if (error) throw error;
          setStudents(
            (data || []).map(student => ({
              value: student.id,
              label: student.full_name
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
  }, [user, selectedStudent]);

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

  if (user?.role !== 'student' && !selectedStudent) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Performance Review</h1>
            <div className="max-w-xl">
              <SearchableSelect
                options={students}
                value={selectedStudent || ''}
                onChange={setSelectedStudent}
                placeholder="Select a student..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">No performance data available</h2>
        <p className="mt-2 text-sm text-gray-500">Please contact your coach or administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Performance Review</h1>
        {user?.role !== 'student' && (
          <div className="flex items-center space-x-4">
            <div className="w-64">
              <SearchableSelect
                options={students}
                value={selectedStudent || ''}
                onChange={setSelectedStudent}
                placeholder="Select a student..."
              />
            </div>
            <div className="w-64">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-left focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <PerformanceOverview
        performance={performance}
        onCreateReview={() => setShowReviewForm(true)}
        onUpdate={() => loadPerformanceData(user?.role === 'student' ? user.id : selectedStudent || '')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <PerformanceMetrics
          metrics={{
            application_rate: 3,
            application_goal: 5,
            response_rate: 15,
            interview_rate: 5,
            technical_readiness: 7,
            behavioral_readiness: 8,
            resume_quality: 9,
          }}
        />
        {/* Performance Alerts */}
        <PerformanceAlerts
          alerts={[
            {
              id: '1',
              student_id: user?.id || '',
              alert_type: 'low_applications',
              severity: 'medium',
              message: 'Application rate below target this week',
              metrics: { weekly_applications: 3 },
              created_at: new Date().toISOString(),
            }
          ]}
          onAcknowledge={(alertId) => {
            console.log('Acknowledge alert:', alertId);
          }}
          onResolve={(alertId) => {
            console.log('Resolve alert:', alertId);
          }}
        />
      </div>
      
      {/* Mock Interviews Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Mock Interviews</h2>
          {user?.role !== 'student' && (
            <button
              onClick={() => setShowMockInterviewForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add Mock Interview
            </button>
          )}
        </div>
        {performance.mock_interviews.length > 0 ? (
          <div className="space-y-4">
            {performance.mock_interviews.map((interview) => (
              <div key={interview.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1)} Interview
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(interview.interview_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Score: {interview.overall_rating}/10
                  </span>
                </div>
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
          {user?.role !== 'student' && (
            <button
              onClick={() => setShowOfficeHoursForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add Office Hours
            </button>
          )}
        </div>
        {performance.office_hours.length > 0 ? (
          <div className="space-y-4">
            {performance.office_hours.map((session) => (
              <div key={session.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {new Date(session.session_date).toLocaleDateString()}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Duration: {session.duration_minutes} minutes
                    </p>
                  </div>
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

      {/* Resume Versions Section */}
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
          coachId={performance.coach?.id || ''}
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
          interviewerId={performance.coach?.id || ''}
          onSuccess={() => {
            setShowMockInterviewForm(false);
            loadPerformanceData(user?.role === 'student' ? user.id : selectedStudent || '');
          }}
          onCancel={() => setShowMockInterviewForm(false)}
        />
      )}
    </div>
  );
}