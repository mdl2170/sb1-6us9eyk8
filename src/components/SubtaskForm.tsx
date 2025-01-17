import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Priority, Status } from '../types';

// Update the USERS constant to use real users
const USERS = [
  { id: 'd7bed21c-5a38-4c44-9d0c-f0b6f5b0c8d1', name: 'Minh Le', role: 'Admin' },
  { id: 'e8bed21c-5a38-4c44-9d0c-f0b6f5b0c8d2', name: 'Tony Duong', role: 'Admin' },
  { id: 'f9bed21c-5a38-4c44-9d0c-f0b6f5b0c8d3', name: 'Linh Pham', role: 'Admin' },
  { id: 'a1bed21c-5a38-4c44-9d0c-f0b6f5b0c8d4', name: 'Thao Nguyen', role: 'Coach' },
  { id: 'b2bed21c-5a38-4c44-9d0c-f0b6f5b0c8d5', name: 'Thanh Nguyen', role: 'Mentor' }
];

interface SubtaskFormProps {
  onSubmit: (subtask: {
    title: string;
    description?: string;
    priority: Priority;
    status: Status;
    due_date?: string;
    assignee?: string;
  }) => void;
  onClose: () => void;
}

export function SubtaskForm({ onSubmit, onClose }: SubtaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<Status>('pending');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        due_date: dueDate || undefined,
        assignee: assignee || undefined,
      });
      setTitle('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Panel */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-medium text-gray-900">Add Subtask</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="subtask-title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="subtask-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter subtask title"
                  required
                />
              </div>

              <div>
                <label htmlFor="subtask-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="subtask-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter subtask description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="subtask-priority" className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    id="subtask-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="subtask-status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="subtask-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="subtask-due-date" className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    id="subtask-due-date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="subtask-assignee" className="block text-sm font-medium text-gray-700">
                    Assignee
                  </label>
                  <select
                    id="subtask-assignee"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Unassigned</option>
                    {USERS.map(user => (
                      <option key={user.id} value={user.name}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

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
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              >
                Add Subtask
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}