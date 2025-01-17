import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Calendar } from 'lucide-react';
import { Task } from '../types';
import { TaskPanel } from './TaskPanel';

interface ProgressOverviewProps {
  tasks: Task[];
}

export function ProgressOverview({ tasks }: ProgressOverviewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Calculate metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const upcomingDeadlines = tasks
    .filter(task => 
      task.status !== 'completed' && 
      task.due_date && 
      new Date(task.due_date) > new Date() &&
      new Date(task.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    )
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 3);

  const highPriorityTasks = tasks
    .filter(task => task.status !== 'completed' && task.priority === 'high')
    .slice(0, 3);

  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium text-gray-900 mb-4">At a Glance</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Completion Rate */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle2 className={`h-6 w-6 ${completionRate >= 70 ? 'text-green-500' : 'text-yellow-500'}`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completion Rate
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {completionRate}%
                    </div>
                    <div className="ml-2 text-sm text-gray-500">
                      ({completedTasks}/{totalTasks} tasks)
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* High Priority Tasks */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    High Priority Tasks
                  </dt>
                  <dd className="mt-1">
                    <div className="text-2xl font-semibold text-gray-900 mb-2">
                      {highPriorityTasks.length}
                    </div>
                    {highPriorityTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="w-full text-left hover:bg-gray-50 p-1 rounded transition-colors duration-150"
                      >
                        <div className="text-sm text-gray-500 truncate">
                          • {task.title}
                        </div>
                      </button>
                    ))}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Upcoming Deadlines
                  </dt>
                  <dd className="mt-1">
                    {upcomingDeadlines.map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="w-full text-left hover:bg-gray-50 p-1 rounded transition-colors duration-150 mb-2"
                      >
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          Due: {new Date(task.due_date!).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                    {upcomingDeadlines.length === 0 && (
                      <div className="text-sm text-gray-500">
                        No upcoming deadlines
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Weekly Progress
                  </dt>
                  <dd className="mt-1">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Tasks Completed</span>
                            <span>{completedTasks} tasks</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-indigo-500 rounded-full" 
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Panel */}
      {selectedTask && (
        <TaskPanel
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}