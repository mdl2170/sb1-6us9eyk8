import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';
import type { Profile } from '../types';

interface BulkActionModalProps {
  selectedUsers: Profile[];
  action: 'role' | 'status' | 'delete';
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkActionModal({ selectedUsers, action, onClose, onSuccess }: BulkActionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToastStore();
  const [value, setValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError('');

      switch (action) {
        case 'role':
          await Promise.all(
            selectedUsers.map(async (user) => {
              // First update the profile role
              const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({
                  role: value,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

              if (profileError) throw profileError;

              // Delete existing role-specific records
              const { error: deleteStudentError } = await supabaseAdmin
                .from('students')
                .delete()
                .eq('id', user.id);
              if (deleteStudentError) throw deleteStudentError;

              const { error: deleteCoachError } = await supabaseAdmin
                .from('coaches')
                .delete()
                .eq('id', user.id);
              if (deleteCoachError) throw deleteCoachError;

              const { error: deleteMentorError } = await supabaseAdmin
                .from('mentors')
                .delete()
                .eq('id', user.id);
              if (deleteMentorError) throw deleteMentorError;

              // Create new role-specific record
              switch (value) {
                case 'student':
                  const { error: studentError } = await supabaseAdmin
                    .from('students')
                    .insert([{
                      id: user.id,
                      enrollment_date: new Date().toISOString(),
                      status: 'active',
                    }]);
                  if (studentError) throw studentError;
                  break;

                case 'coach':
                  const { error: coachError } = await supabaseAdmin
                    .from('coaches')
                    .insert([{
                      id: user.id,
                      specialization: [],
                      max_students: 20,
                    }]);
                  if (coachError) throw coachError;
                  break;

                case 'mentor':
                  const { error: mentorError } = await supabaseAdmin
                    .from('mentors')
                    .insert([{
                      id: user.id,
                      expertise: [],
                      max_mentees: 10,
                    }]);
                  if (mentorError) throw mentorError;
                  break;
              }
            })
          );
          break;

        case 'status':
          await Promise.all(
            selectedUsers.map(async (user) => {
              await supabaseAdmin
                .from('profiles')
                .update({
                  status: value,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);
            })
          );
          break;

        case 'delete':
          await Promise.all(
            selectedUsers.map(async (user) => {
              // Delete role-specific records first
              if (user.role === 'student') {
                const { error: studentError } = await supabaseAdmin
                  .from('students')
                  .delete()
                  .eq('id', user.id);
                if (studentError) throw studentError;
              } else if (user.role === 'coach') {
                const { error: coachError } = await supabaseAdmin
                  .from('coaches')
                  .delete()
                  .eq('id', user.id);
                if (coachError) throw coachError;
              } else if (user.role === 'mentor') {
                const { error: mentorError } = await supabaseAdmin
                  .from('mentors')
                  .delete()
                  .eq('id', user.id);
                if (mentorError) throw mentorError;
              }

              // Delete profile record
              await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', user.id);

              // Delete auth user
              const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
                user.id
              );
              if (authError) throw authError;
            })
          );
          break;
      }

      addToast(`Successfully updated ${selectedUsers.length} users`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform bulk action');
      addToast('Failed to perform bulk action', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (action) {
      case 'role':
        return 'Change Role';
      case 'status':
        return 'Change Status';
      case 'delete':
        return 'Delete Users';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-medium text-gray-900">{getTitle()}</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-500">
                This action will affect {selectedUsers.length} selected users.
              </p>
            </div>

            {action !== 'delete' && (
              <div className="space-y-4">
                {action === 'role' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New Role
                    </label>
                    <select
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select role</option>
                      <option value="student">Student</option>
                      <option value="coach">Coach</option>
                      <option value="mentor">Mentor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New Status
                    </label>
                    <select
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || (!value && action !== 'delete')}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : action === 'delete' ? (
                  'Delete Users'
                ) : (
                  'Apply Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}