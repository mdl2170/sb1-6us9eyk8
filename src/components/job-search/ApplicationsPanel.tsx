import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/useToastStore';
import { Plus, Search, Filter, ChevronDown, Upload } from 'lucide-react';
import { ApplicationForm } from './ApplicationForm';
import { ImportApplicationsModal } from './ImportApplicationsModal';

interface ApplicationsPanelProps {
  studentId?: string;
}

interface JobApplication {
  id: string;
  company_name: string;
  position_title: string;
  application_date: string;
  status: string;
  last_contact_date: string | null;
  next_follow_up: string | null;
}

export function ApplicationsPanel({ studentId }: ApplicationsPanelProps) {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [studentId]);

  async function loadApplications() {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('student_id', studentId)
        .order('application_date', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      addToast('Failed to load applications', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredApplications = applications.filter(app => {
    const matchesSearch = (
      app.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.position_title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApplicationSaved = () => {
    setShowForm(false);
    setSelectedApplication(null);
    loadApplications();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      {showForm ? (
        <ApplicationForm
          application={selectedApplication}
          onSave={handleApplicationSaved}
          onCancel={() => {
            setShowForm(false);
            setSelectedApplication(null);
          }}
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="applied">Applied</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Upload className="h-5 w-5 mr-2" />
                Import
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Application
              </button>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredApplications.length === 0 ? (
                <li className="px-6 py-4 text-center text-gray-500">
                  No applications found
                </li>
              ) : (
                filteredApplications.map((application) => (
                  <li
                    key={application.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedApplication(application);
                      setShowForm(true);
                    }}
                  >
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {application.position_title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {application.company_name}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${application.status === 'offer' ? 'bg-green-100 text-green-800' :
                              application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              application.status === 'interview' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'}
                          `}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Applied: {new Date(application.application_date).toLocaleDateString()}
                          </p>
                        </div>
                        {application.next_follow_up && (
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            Follow-up: {new Date(application.next_follow_up).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
      
      {showImportModal && (
        <ImportApplicationsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadApplications();
          }}
        />
      )}
    </div>
  );
}