import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, GripVertical, Plus, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskBoard } from './TaskBoard';
import { Task, TaskGroup as TaskGroupType } from '../types';

interface TaskGroupProgressProps {
  tasks: Task[];
}

function TaskGroupProgress({ tasks }: TaskGroupProgressProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;

  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const inProgressPercentage = totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0;

  return (
    <div className="flex items-center space-x-6 flex-1">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
          <div 
            className="h-full bg-yellow-500 transition-all duration-300"
            style={{ width: `${inProgressPercentage}%` }}
          />
        </div>
      </div>
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center">
          <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
          <span className="text-gray-600">{completedTasks}</span>
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-yellow-500 mr-1" />
          <span className="text-gray-600">{inProgressTasks}</span>
        </div>
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-gray-600">{pendingTasks}</span>
        </div>
        <div className="text-sm font-medium text-gray-900">
          {Math.round(completionPercentage)}%
        </div>
      </div>
    </div>
  );
}

interface TaskGroupProps {
  group: TaskGroupType;
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskMove: (taskId: string, newGroupId: string) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskDuplicate: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTasksReorder: (tasks: Task[]) => void;
  onAddSubtask: (taskId: string, subtask: any) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onGroupDelete: (groupId: string) => void;
  onGroupUpdate: (groupId: string, updates: Partial<TaskGroupType>) => void;
  onAddTask: () => void;
}

export function TaskGroup({
  group,
  tasks,
  onTaskUpdate,
  onTaskMove,
  onTaskDelete,
  onTaskDuplicate,
  onTaskEdit,
  onTasksReorder,
  onAddSubtask,
  onToggleSubtask,
  onGroupDelete,
  onGroupUpdate,
  onAddTask,
}: TaskGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [title, setTitle] = useState(group.title);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    data: {
      type: 'group',
      group,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    position: 'relative' as const,
    zIndex: isDragging ? 999 : undefined,
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onGroupUpdate(group.id, { title: title.trim() });
      setIsEditing(false);
    }
  };

  const groupTasks = tasks.filter(task => task.groupId === group.id);

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow mb-6 ${isDragging ? 'cursor-grabbing' : ''}`}
      {...attributes}
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center flex-1 min-w-0 space-x-6">
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
              <div
                {...listeners}
                className={`cursor-grab hover:text-gray-600 ${isDragging ? 'cursor-grabbing' : ''}`}
              >
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
              {isEditing ? (
                <form onSubmit={handleTitleSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    autoFocus
                    onBlur={handleTitleSubmit}
                  />
                </form>
              ) : (
                <h2 className="text-lg font-medium text-gray-900">{group.title}</h2>
              )}
            </div>
            <TaskGroupProgress tasks={groupTasks} />
          </div>
          
          <div className="relative ml-4" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onAddTask();
                      setShowMenu(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Task
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Title
                  </button>
                  <button
                    onClick={() => {
                      onGroupDelete(group.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div>
          <TaskBoard
            groups={[group]}
            tasks={groupTasks}
            onTaskUpdate={onTaskUpdate}
            onTaskMove={onTaskMove}
            onTaskDelete={onTaskDelete}
            onTaskDuplicate={onTaskDuplicate}
            onTaskEdit={onTaskEdit}
            onTasksReorder={onTasksReorder}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
          />
        </div>
      )}
    </div>
  );
}