import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { ProgressEntry } from '../types';

interface TaskListProps {
  tasks: ProgressEntry[];
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export function TaskList({ tasks, onStatusChange }: TaskListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(task.status)}
              <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
            </div>
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          {task.description && (
            <p className="mt-2 text-sm text-gray-600">{task.description}</p>
          )}
          
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div>Type: {task.entry_type}</div>
            {task.due_date && (
              <div>Due: {new Date(task.due_date).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}