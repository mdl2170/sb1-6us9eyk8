import React, { useState } from 'react';
import { X, User, GraduationCap, BookOpen, Link, Users, Shield } from 'lucide-react';
import { supabaseAdmin } from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';
import type { StudentProfile } from '../types';

type TabType = 'basic' | 'program';

interface EditStudentModalProps {
  student: StudentProfile;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditStudentModal({ student, onClose, onSuccess }: EditStudentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [coaches, setCoaches] = useState<{ id: string; full_name: string }[]>([]);
  const [mentors, setMentors] = useState<{ id: string; full_name: string }[]>([]);
  const { addToast } = useToastStore();
  const [formData, setFormData] = useState({
    // Basic Info
    email: student.email,
    fullName: student.full_name,
    phone: student.phone || '',
    timezone: student.timezone || '',
    
    // Program Details
    programType: student.program_type || '',
    programStartDate: student.program_start_date || '',
    expectedEndDate: student.expected_end_date || '',
    actualEndDate: student.actual_end_date || '',
    
    // School Info
    school: student.school || '',
    major: student.major || '',
    schoolGraduationDate: student.school_graduation_date || '',
    
    // Social Links
    linkedinUrl: student.linkedin_url || '',
    facebookUrl: student.facebook_url || '',
    studentFolderUrl: student.student_folder_url || '',
    
    // Parent Info
    parentName: student.parent_name || '',
    parentPhone: student.parent_phone || '',
    parentEmail: student.parent_email || '',
    
    // Support Team
    coachId: student.coach?.id || '',
    mentorId: student.mentor?.id || '',
  });

  // Fetch coaches and mentors on mount
  React.useEffect(() => {
    const fetchSupportTeam = async () => {
      try {
        // Fetch coaches
        const { data: coachesData, error: coachesError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'coach')
          .eq('status', 'active')
          .order('full_name');

        if (coachesError) throw coachesError;
        setCoaches(coachesData || []);

        // Fetch mentors
        const { data: mentorsData, error: mentorsError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'mentor')
          .eq('status', 'active')
          .order('full_name');

        if (mentorsError) throw mentorsError;
        setMentors(mentorsData || []);
      } catch (error) {
        console.error('Error fetching support team:', error);
        addToast('Failed to load coaches and mentors', 'error');
      }
    };

    fetchSupportTeam();
  }, [addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError('');

      // Update profile data
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: formData.email,
          full_name: formData.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id);

      if (profileError) throw profileError;

      // Update student data
      const { error: studentError } = await supabaseAdmin
        .from('students')
        .update({
          phone: formData.phone || null,
          timezone: formData.timezone || null,
          program_type: formData.programType || null,
          program_start_date: formData.programStartDate || null,
          expected_end_date: formData.expectedEndDate || null,
          actual_end_date: formData.actualEndDate || null,
          school: formData.school || null,
          major: formData.major || null,
          school_graduation_date: formData.schoolGraduationDate || null,
          linkedin_url: formData.linkedinUrl || null,
          facebook_url: formData.facebookUrl || null,
          student_folder_url: formData.studentFolderUrl || null,
          parent_name: formData.parentName || null,
          parent_phone: formData.parentPhone || null,
          parent_email: formData.parentEmail || null,
          coach_id: formData.coachId || null,
          mentor_id: formData.mentorId || null,
        })
        .eq('id', student.id);

      if (studentError) throw studentError;

      addToast('Student updated successfully', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating student:', err);
      setError(err instanceof Error ? err.message : 'Failed to update student');
      addToast('Failed to update student', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-5xl sm:align-middle">
          <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Edit Student Details</h3>
                <p className="mt-1 text-sm text-gray-500">Update student information and preferences</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('basic')}
                   type="button"
                    className={`${
                      activeTab === 'basic'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <User className="h-5 w-5 mr-2" />
                    Basic Information
                  </button>
                  <button
                    onClick={() => setActiveTab('program')}
                   type="button"
                    className={`${
                      activeTab === 'program'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Program & Support
                  </button>
                </nav>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {activeTab === 'basic' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information Section */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Basic Information</h4>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                    Timezone
                  </label>
                  <input
                    type="text"
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., UTC-5"
                  />
                </div>
              </div>

              {/* School Information */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">School Information</h4>
                </div>
                
                <div>
                  <label htmlFor="school" className="block text-sm font-medium text-gray-700">
                    School
                  </label>
                  <input
                    type="text"
                    id="school"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="major" className="block text-sm font-medium text-gray-700">
                    Major
                  </label>
                  <input
                    type="text"
                    id="major"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="schoolGraduationDate" className="block text-sm font-medium text-gray-700">
                    School Graduation Date
                  </label>
                  <input
                    type="date"
                    id="schoolGraduationDate"
                    value={formData.schoolGraduationDate}
                    onChange={(e) => setFormData({ ...formData, schoolGraduationDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4 md:col-span-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                    <Link className="w-5 h-5 text-pink-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Social Links</h4>
                </div>
                
                <div>
                  <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    id="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="facebookUrl" className="block text-sm font-medium text-gray-700">
                    Facebook URL
                  </label>
                  <input
                    type="url"
                    id="facebookUrl"
                    value={formData.facebookUrl}
                    onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="studentFolderUrl" className="block text-sm font-medium text-gray-700">
                    Student Folder URL
                  </label>
                  <input
                    type="url"
                    id="studentFolderUrl"
                    value={formData.studentFolderUrl}
                    onChange={(e) => setFormData({ ...formData, studentFolderUrl: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Parent Information */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4 md:col-span-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Parent Information</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="parentName" className="block text-sm font-medium text-gray-700">
                      Parent Name
                    </label>
                    <input
                      type="text"
                      id="parentName"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700">
                      Parent Phone
                    </label>
                    <input
                      type="tel"
                      id="parentPhone"
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700">
                      Parent Email
                    </label>
                    <input
                      type="email"
                      id="parentEmail"
                      value={formData.parentEmail}
                      onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Program Details */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-green-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Program Details</h4>
                  </div>
                  
                  <div>
                    <label htmlFor="programType" className="block text-sm font-medium text-gray-700">
                      Program Type
                    </label>
                    <input
                      type="text"
                      id="programType"
                      value={formData.programType}
                      onChange={(e) => setFormData({ ...formData, programType: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="programStartDate" className="block text-sm font-medium text-gray-700">
                      Program Start Date
                    </label>
                    <input
                      type="date"
                      id="programStartDate"
                      value={formData.programStartDate}
                      onChange={(e) => setFormData({ ...formData, programStartDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="expectedEndDate" className="block text-sm font-medium text-gray-700">
                      Expected End Date
                    </label>
                    <input
                      type="date"
                      id="expectedEndDate"
                      value={formData.expectedEndDate}
                      onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="actualEndDate" className="block text-sm font-medium text-gray-700">
                      Actual End Date
                    </label>
                    <input
                      type="date"
                      id="actualEndDate"
                      value={formData.actualEndDate}
                      onChange={(e) => setFormData({ ...formData, actualEndDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Support Team */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Support Team</h4>
                  </div>
                  
                  <div>
                    <label htmlFor="coach" className="block text-sm font-medium text-gray-700">
                      Coach
                    </label>
                    <select
                      id="coach"
                      value={formData.coachId}
                      onChange={(e) => setFormData({ ...formData, coachId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">No coach assigned</option>
                      {coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="mentor" className="block text-sm font-medium text-gray-700">
                      Mentor
                    </label>
                    <select
                      id="mentor"
                      value={formData.mentorId}
                      onChange={(e) => setFormData({ ...formData, mentorId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">No mentor assigned</option>
                      {mentors.map((mentor) => (
                        <option key={mentor.id} value={mentor.id}>
                          {mentor.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}