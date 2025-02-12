import React, { useState, useEffect } from 'react';
import { useToastStore } from '../stores/useToastStore';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Mail, UserPlus, Search, Filter, User, CheckSquare, Square } from 'lucide-react';
import type { Profile } from '../types';
import { AddUserModal } from '../components/AddUserModal';
import { EditUserModal } from '../components/EditUserModal';
import { ImportUsersModal } from '../components/ImportUsersModal';
import { BulkActionModal } from '../components/BulkActionModal';


function formatDate(dateString: string): string {
  // Extract date parts directly from the string
  const [datePart] = dateString.split('T');
  const [year, month, day] = datePart.split('-');
  
  return `${month}/${day}/${year}`;
}

export function UserManagement() {
  const { addToast } = useToastStore();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [bulkAction, setBulkAction] = useState<'role' | 'status' | 'delete' | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Profile;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!profilesData) {
        throw new Error('No profiles data returned');
      }

      setUsers(profilesData);
    } catch (error) {
      console.error('Error fetching users:', error);
      addToast('Failed to fetch users', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Get the user's current role
      const { data: userData, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      const currentRole = userData.role;

      // Delete existing role-specific record
      if (currentRole === 'student') {
        const { error: deleteStudentError } = await supabaseAdmin
          .from('students')
          .delete()
          .eq('id', userId);
        if (deleteStudentError) throw deleteStudentError;
      } else if (currentRole === 'coach') {
        const { error: deleteCoachError } = await supabaseAdmin
          .from('coaches')
          .delete()
          .eq('id', userId);
        if (deleteCoachError) throw deleteCoachError;
      } else if (currentRole === 'mentor') {
        const { error: deleteMentorError } = await supabaseAdmin
          .from('mentors')
          .delete()
          .eq('id', userId);
        if (deleteMentorError) throw deleteMentorError;
      }

      // Update the user's role
      const { error } = await supabaseAdmin
        .rpc('update_user_role', {
          user_id: userId,
          new_role: newRole
        });
      if (error) throw error;

      // Create new role-specific record
      switch (newRole) {
        case 'student':
          const { error: studentError } = await supabaseAdmin
            .from('students')
            .insert([{
              id: userId,
              enrollment_date: new Date().toISOString(),
              status: 'active'
            }]);
          if (studentError) throw studentError;
          break;

        case 'coach':
          const { error: coachError } = await supabaseAdmin
            .from('coaches')
            .insert([{
              id: userId,
              specialization: [],
              max_students: 20
            }]);
          if (coachError) throw coachError;
          break;

        case 'mentor':
          const { error: mentorError } = await supabaseAdmin
            .from('mentors')
            .insert([{
              id: userId,
              expertise: [],
              max_mentees: 10
            }]);
          if (mentorError) throw mentorError;
          break;
      }

      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
      addToast('User role updated successfully', 'success');
    } catch (error) {
      console.error('Error updating user role:', error);
      addToast('Failed to update user role', 'error');
    }
  };

  const updateUserStatus = async (userId: string, newStatus: Profile['status']) => {
    try {
      const { error } = await supabaseAdmin
        .rpc('update_user_status', {
          user_id: userId,
          new_status: newStatus
        });

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: newStatus } : u
      ));
      addToast('User status updated successfully', 'success');
    } catch (error) {
      console.error('Error updating user status:', error);
      addToast('Failed to update user status', 'error');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Get user's current role
      const { data: userData, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Delete role-specific record first
      switch (userData.role) {
        case 'student':
          const { error: studentError } = await supabaseAdmin
            .from('students')
            .delete()
            .eq('id', userId);
          if (studentError) throw studentError;
          break;

        case 'coach':
          const { error: coachError } = await supabaseAdmin
            .from('coaches')
            .delete()
            .eq('id', userId);
          if (coachError) throw coachError;
          break;

        case 'mentor':
          const { error: mentorError } = await supabaseAdmin
            .from('mentors')
            .delete()
            .eq('id', userId);
          if (mentorError) throw mentorError;
          break;
      }

      // Delete profile record
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (profileError) throw profileError;

      // Delete auth user
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      setUsers(users.filter(u => u.id !== userId));
      addToast('User deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      addToast('Failed to delete user', 'error');
    }
  };

  const sendWelcomeEmail = async (userId: string) => {
    try {
      const { error } = await supabaseAdmin.rpc('send_welcome_email', {
        user_id: userId
      });

      if (error) throw error;

      addToast('Welcome email sent successfully', 'success');
    } catch (error) {
      console.error('Error sending welcome email:', error);
      addToast('Failed to send welcome email', 'error');
    }
  };
  
  const handleSort = (key: keyof Profile) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = 
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      
      const { key, direction } = sortConfig;
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleImportUsers = async (users: any[]) => {
    try {
      for (const userData of users) {
        // Create auth user and profile with service role
        const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
          },
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('Failed to create user');

        // Create profile record
        const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);

        if (profileError) throw profileError;

        // Create role-specific record
        switch (userData.role) {
          case 'student':
            const { error: studentError } = await supabaseAdmin.from('students').insert([{
              id: authData.user.id,
              enrollment_date: new Date().toISOString(),
              status: 'active',
              program_start_date: userData['Student: Program Start Date'] || null,
              expected_end_date: userData['Student: Expected End Date'] || null,
              program_type: userData['Student: Program Type'] || null,
              school: userData['Student: School'] || null,
              school_graduation_date: userData['Student: School Graduation Date'] || null,
              linkedin_url: userData['Student: LinkedIn URL'] || null,
              facebook_url: userData['Student: Facebook URL'] || null,
              phone: userData['Student: Phone'] || null,
              major: userData['Student: Major'] || null,
              timezone: userData['Student: Timezone'] || null,
              parent_name: userData['Student: Parent Name'] || null,
              parent_phone: userData['Student: Parent Phone'] || null,
              parent_email: userData['Student: Parent Email'] || null,
            }]);
            if (studentError) throw studentError;
            break;

          case 'mentor':
            const { error: mentorError } = await supabaseAdmin.from('mentors').insert([{
              id: authData.user.id,
              expertise: [],
              max_mentees: 10,
              linkedin_url: userData['Mentor: LinkedIn URL'] || null,
              bio: userData['Mentor: Bio'] || null,
              company: userData['Mentor: Company'] || null,
              internal_note: userData['Mentor: Internal Note'] || null,
            }]);
            if (mentorError) throw mentorError;
            break;

          case 'coach':
            const { error: coachError } = await supabaseAdmin.from('coaches').insert([{
              id: authData.user.id,
              specialization: [],
              max_students: 20,
            }]);
            if (coachError) throw coachError;
            break;
        }
      }

      fetchUsers();
      addToast('Users imported successfully', 'success');
    } catch (error) {
      console.error('Error importing users:', error);
      addToast('Failed to import users', 'error');
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredAndSortedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredAndSortedUsers);
    }
  };

  const handleSelectUser = (user: Profile) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
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
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <div className="flex items-center space-x-3">
            {selectedUsers.length > 0 && (
              <>
                <select
                  onChange={(e) => setBulkAction(e.target.value as any)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <option value="">Bulk Actions</option>
                  <option value="role">Change Role</option>
                  <option value="status">Change Status</option>
                  <option value="welcome">Send Welcome Emails</option>
                  <option value="delete">Delete Users</option>
                </select>
                <span className="text-sm font-medium text-gray-700">
                  {selectedUsers.length} selected
                </span>
              </>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Import Users
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Add User
            </button>
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
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="coach">Coaches</option>
                  <option value="mentor">Mentors</option>
                  <option value="admin">Admins</option>
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
                      {selectedUsers.length === filteredAndSortedUsers.length ? (
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
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('role')}
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('created_at')}
                  >
                    Created
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center">
                      <button
                        onClick={() => handleSelectUser(user)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {selectedUsers.find(u => u.id === user.id) ? (
                          <CheckSquare className="h-5 w-5" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={user.avatar_url}
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
                            {user.full_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="student">Student</option>
                        <option value="coach">Coach</option>
                        <option value="mentor">Mentor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.status}
                        onChange={(e) => updateUserStatus(user.id, e.target.value as Profile['status'])}
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'inactive'
                            ? 'bg-yellow-100 text-yellow-800'
                            : user.status === 'suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this user?')) {
                              deleteUser(user.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => sendWelcomeEmail(user.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Send welcome email"
                        >
                          <Mail className="h-5 w-5" />
                        </button>
                      </div>
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
            fetchUsers();
          }}
        />
      )}

      {showImportModal && (
        <ImportUsersModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportUsers}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
            setSelectedUsers([]);
          }}
        />
      )}

      {bulkAction && (
        <BulkActionModal
          selectedUsers={selectedUsers}
          action={bulkAction}
          onClose={() => {
            setBulkAction(null);
            setSelectedUsers([]);
          }}
          onSuccess={() => {
            setBulkAction(null);
            setSelectedUsers([]);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}