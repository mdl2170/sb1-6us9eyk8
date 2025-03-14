import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Briefcase, Users, BarChart, Target, User, FileText } from 'lucide-react';
import { useSelectedStudentStore } from '../stores/useSelectedStudentStore';
import { SearchableSelect } from '../components/SearchableSelect';
import { CareerGoalsPanel } from '../components/job-search/CareerGoalsPanel';
import { ResumeUploadPanel } from '../components/job-search/ResumeUploadPanel';
import { ApplicationsPanel } from '../components/job-search/ApplicationsPanel';
import { NetworkingPanel } from '../components/job-search/NetworkingPanel';
import { ProgressPanel } from '../components/job-search/ProgressPanel';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';

export function JobSearch() {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const { selectedStudent, setSelectedStudent } = useSelectedStudentStore();
  const [activeTab, setActiveTab] = useState('goals');
  const [students, setStudents] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tabs = [
    {
      id: 'goals',
      name: 'Career Goals',
      icon: Target,
      component: CareerGoalsPanel
    },
    {
      id: 'resume',
      name: 'Resume',
      icon: FileText,
      component: ResumeUploadPanel
    },
    {
      id: 'applications',
      name: 'Applications',
      icon: Briefcase,
      component: ApplicationsPanel
    },
    {
      id: 'networking',
      name: 'Networking',
      icon: Users,
      component: NetworkingPanel
    },
    {
      id: 'progress',
      name: 'Progress',
      icon: BarChart,
      component: ProgressPanel
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || CareerGoalsPanel;

  // Load students for staff members
  useEffect(() => {
    if (user?.role !== 'student') {
      const loadStudents = async () => {
        try {
          let query = supabase
            .from('students')
            .select(`
              id,
              profile:profiles!students_id_fkey (
                id,
                full_name
              )
            `)
            .order('profile(full_name)');

          // Filter by coach_id if user is a coach
          if (user?.role === 'coach') {
            query = query.eq('coach_id', user.id);
          }

          const { data, error } = await query;

          if (error) throw error;
          setStudents(
            (data || []).map(student => ({
              value: student.profile.id,
              label: student.profile.full_name
            }))
          );
        } catch (err) {
          console.error('Error loading students:', err);
          addToast('Failed to load students', 'error');
        } finally {
          setIsLoading(false);
        }
      };

      loadStudents();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 -mt-8 -mx-8 -mb-8">
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Job Search Tracker</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track your job search progress, manage applications, and grow your professional network
        </p>

        {user?.role !== 'student' && (
          <div className="bg-white shadow rounded-lg mt-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Please select a student</h2>
              <p className="mt-1 text-sm text-gray-500">
                Choose a student from the dropdown below to view and manage their job search progress
              </p>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <SearchableSelect
                    options={students}
                    value={selectedStudent || ''}
                    onChange={setSelectedStudent}
                    placeholder="Select student..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (user?.role === 'student' || selectedStudent) && (
        <div className="bg-white shadow rounded-lg mt-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${isActive
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon
                      className={`
                        -ml-0.5 mr-2 h-5 w-5
                        ${isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
                      `}
                    />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            <ActiveComponent studentId={user?.role === 'student' ? user.id : selectedStudent} />
          </div>
        </div>
        )}
      </div>
    </div>
  );
}