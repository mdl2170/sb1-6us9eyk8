import React, { useState, useEffect } from 'react';
import { useToastStore } from '../stores/useToastStore';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Shield, UserPlus, Search, Filter, MoreVertical, User, CheckSquare, Square, GraduationCap, Clock } from 'lucide-react';
import type { Profile } from '../types';
import { EditStudentModal } from '../components/EditStudentModal';
import { BulkActionModal } from '../components/BulkActionModal';

interface StudentProfile extends Profile {
  cohort?: string;
  enrollment_date: string;
  coach?: {
    id: string;
    full_name: string;
    email: string;
  };
  mentor?: {
    id: string;
    full_name: string;
    email: string;
  };
  completion_rate?: number;
  engagement_score?: number;
  risk_level?: 'low' | 'medium' | 'high';
}

export function StudentManagement() {
  const { addToast } = useToastStore();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cohortFilter, setCohortFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<StudentProfile[]>([]);
  const [bulkAction, setBulkAction] = useState<'status' | 'cohort' | 'delete' | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof StudentProfile;
    direction: 'asc' | 'desc';
  } | null>(null);

  const fetchStudentProfiles = async () => {
    try {
      setIsLoading(true);
      // First get all profiles with student role
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then get the corresponding student details
      const studentIds = profilesData?.map(p => p.id) || [];
      const { data: studentsData, error: studentsError } = await supabaseAdmin
        .from('students')
        .select(`
          *,
          coach:coach_id(id, full_name, email),
          mentor:mentor_id(id, full_name, email)
        `)
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Combine profile and student data
      const combinedData = profilesData?.map(profile => {
        const studentDetails = studentsData?.find(s => s.id === profile.id);
        return {
          ...profile,
          ...studentDetails,
        };
      }) || [];

      setStudents(combinedData);
    } catch (error) {
      console.error('Error fetching students:', error);
      addToast('Failed to fetch students', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentProfiles();
  }, []);

  const handleSort = (key: keyof StudentProfile) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedStudents = students
    .filter(student => {
      const matchesSearch = 
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
      const matchesCohort = cohortFilter === 'all' || student.cohort === cohortFilter;
      return matchesSearch && matchesStatus && matchesCohort;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      
      const { key, direction } = sortConfig;
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredAndSortedStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredAndSortedStudents);
    }
  };

  const handleSelectStudent = (student: StudentProfile) => {
    if (selectedStudents.find(s => s.id === student.id)) {
      setSelectedStudents(selectedStudents.filter(s => s.id !== student.id));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Student Management</h1>
          <div className="flex items-center space-x-3">
            {selectedStudents.length > 0 && (
              <>
                <select
                  onChange={(e) => setBulkAction(e.target.value as any)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <option value="">Bulk Actions</option>
                  <option value="status">Change Status</option>
                  <option value="cohort">Change Cohort</option>
                  <option value="delete">Delete Students</option>
                </select>
                <span className="text-sm font-medium text-gray-700">
                  {selectedStudents.length} selected
                </span>
              </>
            )}
            
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StudentProfile['status'])}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="graduated">Graduated</option>
                </select>
              </div>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Cohorts</option>
                  {Array.from(new Set(students.map(s => s.cohort))).map(cohort => (
                    <option key={cohort} value={cohort}>{cohort}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {selectedStudents.length === filteredAndSortedStudents.length ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('full_name')}
                  >
                    Student
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('cohort')}
                  >
                    Cohort
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Progress
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Risk Level
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Support Team
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleSelectStudent(student)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {selectedStudents.find(s => s.id === student.id) ? (
                          <CheckSquare className="h-5 w-5" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {student.avatar_url ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={student.avatar_url}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <User className="h-6 w-6 text-indigo-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.full_name}
                          </div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.cohort}</div>
                      <div className="text-sm text-gray-500">
                        Enrolled: {new Date(student.enrollment_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 w-24">Completion:</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${student.completion_rate || 0}%` }}
                            />
                          </div>
                          <span className="ml-2 text-sm text-gray-600">
                            {student.completion_rate || 0}%
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 w-24">Engagement:</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${student.engagement_score || 0}%` }}
                            />
                          </div>
                          <span className="ml-2 text-sm text-gray-600">
                            {student.engagement_score || 0}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        student.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                        student.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {student.risk_level || 'low'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.coach ? (
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 text-indigo-500 mr-1" />
                            {student.coach.full_name}
                          </div>
                        ) : (
                          <div className="text-gray-500">No coach assigned</div>
                        )}
                      </div>
                      <div className="text-sm text-gray-900 mt-1">
                        {student.mentor ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-green-500 mr-1" />
                            {student.mentor.full_name}
                          </div>
                        ) : (
                          <div className="text-gray-500">No mentor assigned</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchStudentProfiles();
          }}
        />
      )}

      {showImportModal && (
        <ImportUsersModal
          onClose={() => setShowImportModal(false)}
          onImport={async (users) => {
            try {
              // Create profiles
              const { error: profileError } = await supabase
                .from('profiles')
                .insert(users.map(user => ({
                  email: user.email,
                  full_name: user.full_name,
                  role: 'student',
                  status: 'active'
                })));

              if (profileError) throw profileError;

              fetchStudentProfiles();
              addToast('Students imported successfully', 'success');
              setShowImportModal(false);
            } catch (error) {
              console.error('Error importing students:', error);
              addToast('Failed to import students', 'error');
            }
          }}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={() => {
            setEditingStudent(null);
            fetchStudentProfiles();
            setSelectedStudents([]);
          }}
        />
      )}

      {bulkAction && (
        <BulkActionModal
          selectedUsers={selectedStudents}
          action={bulkAction}
          onClose={() => {
            setBulkAction(null);
            setSelectedStudents([]);
          }}
          onSuccess={() => {
            setBulkAction(null);
            setSelectedStudents([]);
            fetchStudentProfiles();
          }}
        />
      )}
    </div>
  );
}