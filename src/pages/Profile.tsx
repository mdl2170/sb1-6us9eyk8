import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToastStore } from '../stores/useToastStore';
import { fetchProfile, updateProfile, updateStudentProfile, updateAvatar } from '../lib/supabase';
import { Camera, Briefcase, Calendar, Mail, MapPin, User, Upload, School, Clock, GraduationCap, Globe, Book, Link, Phone, Folder, Facebook } from 'lucide-react';
import type { StudentProfile } from '../types';

export function Profile() {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add a unique key for localStorage
  const FORM_STORAGE_KEY = `profile-form-${user?.id}`;

  const initialFormData = {
    full_name: '',
    email: '',
    phone: '',
    program_type: '',
    school: '',
    major: '',
    timezone: '',
    linkedin_url: '',
    facebook_url: '',
    student_folder_url: '',
    program_start_date: '',
    expected_end_date: '',
    school_graduation_date: '',
    target_role: '',
    cohort: '',
    job_search_status: '',
    specialization: [] as string[],
    expertise: [] as string[],
  };

  const [formData, setFormData] = useState(initialFormData);

  // Load saved form data from localStorage when entering edit mode
  useEffect(() => {
    if (isEditing) {
      const savedFormData = localStorage.getItem(FORM_STORAGE_KEY);
      if (savedFormData) {
        setFormData(JSON.parse(savedFormData));
      }
    }
  }, [isEditing, FORM_STORAGE_KEY]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (isEditing) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, isEditing, FORM_STORAGE_KEY]);

  // Clear localStorage when form is submitted or cancelled
  const clearSavedForm = () => {
    localStorage.removeItem(FORM_STORAGE_KEY);
  };

  // Determine which fields to show based on role
  const visibleFields = useMemo(() => {
    if (!user) return [];

    switch (user.role) {
      case 'student':
        return [
          'full_name', 'email', 'program_type', 'school', 'major',
          'timezone', 'linkedin_url', 'program_start_date', 'expected_end_date',
          'school_graduation_date', 'target_role', 'cohort', 'job_search_status'
        ];
      case 'coach':
        return ['full_name', 'email', 'specialization'];
      case 'mentor':
        return ['full_name', 'email', 'expertise'];
      case 'admin':
        return ['full_name', 'email'];
      default:
        return ['full_name', 'email'];
    }
  }, [user?.role]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profileData = await fetchProfile(user!.id);
      setProfile(profileData);
      
      // Initialize form data with profile data
      const savedFormData = localStorage.getItem(FORM_STORAGE_KEY);
      if (savedFormData) {
        // Use saved form data if it exists
        setFormData(JSON.parse(savedFormData));
      } else {
        // Otherwise use profile data
        setFormData({
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          program_type: profileData.program_type || '',
          school: profileData.school || '',
          major: profileData.major || '',
          timezone: profileData.timezone || '',
          linkedin_url: profileData.linkedin_url || '',
          facebook_url: profileData.facebook_url || '',
          student_folder_url: profileData.student_folder_url || '',
          program_start_date: profileData.program_start_date || '',
          expected_end_date: profileData.expected_end_date || '',
          school_graduation_date: profileData.school_graduation_date || '',
          target_role: profileData.target_role || '',
          cohort: profileData.cohort || '',
          job_search_status: profileData.job_search_status || '',
          specialization: profileData.specialization || [],
          expertise: profileData.expertise || [],
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      addToast('Failed to load profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const publicUrl = await updateAvatar(user!.id, file);
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      addToast('Avatar updated successfully', 'success');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      addToast('Failed to upload avatar', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { email, ...profileUpdates } = formData;

    try {
      await updateProfile(user.id, {
        full_name: profileUpdates.full_name,
      });

      if (user.role === 'student') {
        await updateStudentProfile(user.id, {
          target_role: profileUpdates.target_role,
          program_type: profileUpdates.program_type,
          school: profileUpdates.school,
          major: profileUpdates.major,
          timezone: profileUpdates.timezone,
          linkedin_url: profileUpdates.linkedin_url,
          program_start_date: profileUpdates.program_start_date,
          expected_end_date: profileUpdates.expected_end_date,
          school_graduation_date: profileUpdates.school_graduation_date,
          cohort: profileUpdates.cohort,
          job_search_status: profileUpdates.job_search_status as StudentProfile['job_search_status'],
        });
      }

      setIsEditing(false);
      clearSavedForm(); // Clear saved form data after successful submit
      loadProfile();
      addToast('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      addToast('Failed to update profile', 'error');
    }
  };

  // Add beforeunload event handler to warn users before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing]);

  // Update the edit button click handler
  const handleEditClick = () => {
    // When entering edit mode, initialize form with current profile data
    setFormData({
      full_name: profile?.full_name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      program_type: profile?.program_type || '',
      school: profile?.school || '',
      major: profile?.major || '',
      timezone: profile?.timezone || '',
      linkedin_url: profile?.linkedin_url || '',
      facebook_url: profile?.facebook_url || '',
      student_folder_url: profile?.student_folder_url || '',
      program_start_date: profile?.program_start_date || '',
      expected_end_date: profile?.expected_end_date || '',
      school_graduation_date: profile?.school_graduation_date || '',
      target_role: profile?.target_role || '',
      cohort: profile?.cohort || '',
      job_search_status: profile?.job_search_status || '',
      specialization: profile?.specialization || [],
      expertise: profile?.expertise || [],
    });
    setIsEditing(true);
  };

  // Update the cancel handler
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      setIsEditing(false);
      clearSavedForm();
      // Reset form to current profile data instead of initial empty state
      setFormData({
        full_name: profile?.full_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        program_type: profile?.program_type || '',
        school: profile?.school || '',
        major: profile?.major || '',
        timezone: profile?.timezone || '',
        linkedin_url: profile?.linkedin_url || '',
        facebook_url: profile?.facebook_url || '',
        student_folder_url: profile?.student_folder_url || '',
        program_start_date: profile?.program_start_date || '',
        expected_end_date: profile?.expected_end_date || '',
        school_graduation_date: profile?.school_graduation_date || '',
        target_role: profile?.target_role || '',
        cohort: profile?.cohort || '',
        job_search_status: profile?.job_search_status || '',
        specialization: profile?.specialization || [],
        expertise: profile?.expertise || [],
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

        {/* Profile Header */}
        <div className="relative px-6 pb-6">
          <div className="flex items-end -mt-16 mb-4">
            <div className="relative">
              <div className="h-32 w-32 rounded-full border-4 border-white overflow-hidden bg-white">
                {profile?.avatar_url ? (
                  <img
                    src={profile?.avatar_url}
                    alt={profile?.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-indigo-100 flex items-center justify-center">
                    <User className="h-12 w-12 text-indigo-500" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white shadow-lg hover:bg-gray-50"
              >
                <Camera className="h-5 w-5 text-gray-600" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="ml-6 flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h1>
              <p className="text-sm text-gray-500 mt-1 capitalize">{profile?.role}</p>
            </div>
            {!isEditing && (
              <button
                onClick={handleEditClick}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Profile Info */}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Timezone
                    </label>
                    <input
                      type="text"
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="e.g., UTC+7"
                    />
                  </div>
                </div>
              </div>

              {/* School Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">School Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      School
                    </label>
                    <input
                      type="text"
                      value={formData.school}
                      onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Major
                    </label>
                    <input
                      type="text"
                      value={formData.major}
                      onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      School Graduation Date
                    </label>
                    <input
                      type="date"
                      value={formData.school_graduation_date}
                      onChange={(e) => setFormData({ ...formData, school_graduation_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Social Links</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Facebook URL
                    </label>
                    <input
                      type="url"
                      value={formData.facebook_url}
                      onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="https://facebook.com/username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Student Folder URL
                    </label>
                    <input
                      type="url"
                      value={formData.student_folder_url}
                      onChange={(e) => setFormData({ ...formData, student_folder_url: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Program Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Program Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Program Type
                    </label>
                    <select
                      value={formData.program_type}
                      onChange={(e) => setFormData({ ...formData, program_type: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select program type</option>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="self_paced">Self Paced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Program Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.program_start_date}
                      onChange={(e) => setFormData({ ...formData, program_start_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Expected End Date
                    </label>
                    <input
                      type="date"
                      value={formData.expected_end_date}
                      onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-gray-900">{profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-gray-900">{profile?.phone || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Timezone</p>
                      <p className="text-gray-900">{profile?.timezone || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* School Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">School Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-3">
                    <School className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">School</p>
                      <p className="text-gray-900">{profile?.school || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Book className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Major</p>
                      <p className="text-gray-900">{profile?.major || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <GraduationCap className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">School Graduation Date</p>
                      <p className="text-gray-900">{profile?.school_graduation_date ? new Date(profile.school_graduation_date).toLocaleDateString() : 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Social Links</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-3">
                    <Link className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">LinkedIn</p>
                      <p className="text-gray-900">
                        {profile?.linkedin_url ? (
                          <a
                            href={profile.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            View Profile
                          </a>
                        ) : (
                          'Not set'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Facebook className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Facebook</p>
                      <p className="text-gray-900">
                        {profile?.facebook_url ? (
                          <a
                            href={profile.facebook_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            View Profile
                          </a>
                        ) : (
                          'Not set'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Folder className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Student Folder</p>
                      <p className="text-gray-900">
                        {profile?.student_folder_url ? (
                          <a
                            href={profile.student_folder_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            View Folder
                          </a>
                        ) : (
                          'Not set'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Program Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Program Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-3">
                    <School className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Program Type</p>
                      <p className="text-gray-900 capitalize">{profile?.program_type?.replace(/_/g, ' ') || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Program Dates</p>
                      <p className="text-gray-900">
                        {profile?.program_start_date ? (
                          <>
                            {new Date(profile.program_start_date).toLocaleDateString()} - 
                            {profile?.expected_end_date ? 
                              new Date(profile.expected_end_date).toLocaleDateString() : 
                              'Ongoing'}
                          </>
                        ) : (
                          'Not set'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Support Team Section - Only visible for students */}
        {profile?.role === 'student' && (
          <div className="border-t border-gray-200 px-6 py-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Support Team</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  {profile.coach ? (
                    <>
                      <p className="text-sm font-medium text-gray-900">{profile.coach.full_name}</p>
                      <p className="text-sm text-gray-500">Coach</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">No coach assigned</p>
                      <p className="text-sm text-gray-500">Coach</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  {profile.mentor ? (
                    <>
                      <p className="text-sm font-medium text-gray-900">{profile.mentor.full_name}</p>
                      <p className="text-sm text-gray-500">Mentor</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">No mentor assigned</p>
                      <p className="text-sm text-gray-500">Mentor</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}