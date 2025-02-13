import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Task, TaskGroup } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { getUsers } from '../services/userService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface TaskFormProps {
  groups: TaskGroup[];
  initialData?: Task | null;
  onSubmit: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'subtasks' | 'resources'>) => void;
  onCancel: () => void;
}

export function TaskForm({ groups, initialData, onSubmit, onCancel }: TaskFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
  const [priority, setPriority] = useState<Task['priority']>(initialData?.priority || 'medium');
  const [status, setStatus] = useState<Task['status']>(initialData?.status || 'pending');
  const [dueDate, setDueDate] = useState(initialData?.due_date || '');
  const [assignee, setAssignee] = useState(initialData?.assignee || '');
  const [groupId, setGroupId] = useState(initialData?.groupId || groups[0]?.id);
  const [tags, setTags] = useState(initialData?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [assignableUsers, setAssignableUsers] = useState<{ value: string, label: string }[]>([]);

  const retrievedDueDate = dueDate.split('T')[0];
  
  useEffect(() => {
    const loadAssignableUsers = async () => {
      try {
        if (user?.role === 'student') {
          // Get student's coach and mentor
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select(`
              coach:coach_id(id, full_name),
              mentor:mentor_id(id, full_name)
            `)
            .eq('id', user.id)
            .single();

          if (studentError) throw studentError;

          const users = [
            { value: user.full_name, label: user.full_name }
          ];

          if (studentData.coach) {
            users.push({ 
              value: studentData.coach.full_name,
              label: studentData.coach.full_name
            });
          }
          if (studentData.mentor) {
            users.push({
              value: studentData.mentor.full_name,
              label: studentData.mentor.full_name
            });
          }

          setAssignableUsers(users);
          // Auto-select the student as assignee if creating a new task
          if (!initialData) {
            setAssignee(user.full_name);
          }
        } else {
          // For staff, get all users
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .order('full_name');

          if (error) throw error;
          setAssignableUsers(
            data.map(user => ({
              value: user.full_name,
              label: user.full_name
            }))
          );
        }
      } catch (err) {
        console.error('Error loading assignable users:', err);
      }
    };

    loadAssignableUsers();
  }, [user, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(dueDate);
    onSubmit({
      title,
      description,
      due_date: dueDate || undefined,
      priority,
      groupId,
      status: initialData?.status || 'pending',
      tags,
      assignee,
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />

        {/* Panel */}
        <div className="inline-block transform rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-medium text-gray-900">
                {initialData ? 'Edit Task' : 'New Task'}
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="group" className="block text-sm font-medium text-gray-700">
                    Group
                  </label>
                  <select
                    id="group"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task['priority'])}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    value={ retrievedDueDate }
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="assignee" className="block text-sm font-medium text-gray-700">
                    Assignee
                  </label>
                  <div className="relative">
                    <SearchableSelect
                      options={assignableUsers}
                      value={assignee}
                      onChange={setAssignee}
                      placeholder="Select assignee"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Add a tag"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1.5 inline-flex items-center justify-center text-indigo-600 hover:text-indigo-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
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
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              >
                {initialData ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}