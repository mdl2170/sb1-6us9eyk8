import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { updateTaskOrder } from '../lib/supabase';
import { Calendar, Clock, Tag, User, MoreVertical, Copy, Edit, Trash2, GripVertical, ListTodo, ChevronDown, ChevronRight } from 'lucide-react';
import type { Task, TaskGroup } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { SubtaskForm } from './SubtaskForm';
import { TaskPanel } from './TaskPanel';

interface TaskRowProps {
  task: Task;
  groups: TaskGroup[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskMove: (taskId: string, newGroupId: string) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskDuplicate: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onAddSubtask: (taskId: string, subtask: any) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

interface TaskMenuProps {
  onEdit: () => void;
  onAddSubtask: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function formatDate(dateString: string, isOverdue?: boolean): JSX.Element {
  const [datePart] = dateString.split('T');
  const [year, month, day] = datePart.split('-');
  
  return (
    <span className={`${isOverdue ? 'text-red-600 font-medium' : ''}`}>
      {`${month}/${day}/${year}`}
    </span>
  );
}

function isTaskOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.due_date);
  return dueDate < today;
}

function TaskMenu({ onEdit, onAddSubtask, onDuplicate, onDelete, onClose }: TaskMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  return (
    <div
      ref={menuRef}
      className="fixed w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
      style={{
        top: 'var(--menu-top)',
        left: 'var(--menu-left)',
      }}
    >
      <div className="py-1" role="menu">
        <button
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </button>
        <button
          onClick={() => {
            onAddSubtask();
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <ListTodo className="h-4 w-4 mr-2" />
          Add Subtask
        </button>
        <button
          onClick={() => {
            onDuplicate();
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </button>
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </button>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  groups,
  onTaskUpdate,
  onTaskMove,
  onTaskDelete,
  onTaskDuplicate,
  onTaskEdit,
  onAddSubtask,
  onToggleSubtask,
}: TaskRowProps) {
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();

      // Use viewport-relative positioning
      const top = rect.bottom;
      const left = Math.max(0, rect.left - 160); // Offset to align better

      document.documentElement.style.setProperty('--menu-top', `${top}px`);
      document.documentElement.style.setProperty('--menu-left', `${left}px`);
    }

    setShowMenu(!showMenu);
  };
  
  return (
    <>
      <tr 
        ref={setNodeRef} 
        style={style} 
        className="hover:bg-gray-50 group"
        onClick={(e) => {
          // Only open details if not clicking a button or select
          if (!(e.target as HTMLElement).closest('button, select')) {
            setShowDetails(true);
          }
        }}
      >
        <td className="px-6 py-4 w-[40%]">
          <div className="flex items-start">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <div className="flex items-center">
                {!task.parent_id && (
                  <div className="mr-2 w-4">
                    {task.subtasks?.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExpanded(!isExpanded);
                        }}
                        className="text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                )}
                <div className={`text-sm font-medium text-gray-900 ${task.parent_id ? 'ml-8' : ''}`}>
                  {task.title}
                </div>
              </div>
              {task.description && (
                <div className="text-sm text-gray-500 mt-1">{task.description}</div>
              )}
              {'tags' in task && task.tags && task.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-6 py-4 w-[12%]">
          <select
            value={task.status}
            onChange={(e) => {
              e.stopPropagation();
              onTaskUpdate(task.id, { status: e.target.value as Task['status'] });
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </td>
        <td className="px-6 py-4 w-[12%]">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
            ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
            }`}
          >
            {task.priority}
          </span>
        </td>
        <td className="px-6 py-4 w-[12%]">
          {task.due_date && (
            <div className={`flex items-center ${isTaskOverdue(task) ? 'text-red-600' : ''}`}>
              <Calendar className={`h-4 w-4 mr-1 ${isTaskOverdue(task) ? 'text-red-600' : ''}`} />
              {formatDate(task.due_date, isTaskOverdue(task))}
            </div>
          )}
        </td>
        <td className="px-6 py-4 w-[12%]">
          <div className="flex items-center justify-between">
            {task.assignee ? (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span className="text-sm text-gray-900">{task.assignee}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Unassigned</span>
            )}
            <div className="relative">
              <button
                ref={menuButtonRef}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleMenuClick(e);
                }}
                className="p-1 rounded-full hover:bg-gray-100 relative"
              >
                <MoreVertical className="h-5 w-5 text-gray-400" />
              </button>
              {showMenu && createPortal(
                <TaskMenu
                  onEdit={() => onTaskEdit(task)}
                  onAddSubtask={() => setShowSubtaskForm(true)}
                  onDuplicate={() => {
                    if (task.subtasks?.length > 0) {
                      setShowDuplicateConfirm(true);
                    } else {
                      onTaskDuplicate(task.id);
                    }
                    setShowMenu(false);
                  }}
                  onDelete={() => {
                    if (task.subtasks?.length > 0) {
                      setShowDeleteConfirm(true);
                    } else {
                      onTaskDelete(task.id);
                    }
                    setShowMenu(false);
                  }}
                  onClose={() => setShowMenu(false)}
                />,
                document.body
              )}
            </div>
          </div>
        </td>
      </tr>
      {isExpanded && task.subtasks && task.subtasks.length > 0 && (
        <tr>
          <td colSpan={6} className="p-0">
            <table className="min-w-full">
              <tbody>
                {task.subtasks.map((subtask) => (
                  <TaskRow
                    key={subtask.id}
                    task={{
                      ...subtask,
                      groupId: task.groupId,
                      tags: [],
                      subtasks: [],
                    }}
                    groups={groups}
                    onTaskUpdate={onTaskUpdate}
                    onTaskMove={onTaskMove}
                    onTaskDelete={onTaskDelete}
                    onTaskDuplicate={onTaskDuplicate}
                    onTaskEdit={onTaskEdit}
                    onAddSubtask={onAddSubtask}
                    onToggleSubtask={onToggleSubtask}
                  />
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
      {showSubtaskForm && (
        <tr>
          <td colSpan={6}>
            <div className="p-4 bg-gray-50">
              <SubtaskForm
                onSubmit={(subtaskData) => {
                  onAddSubtask(task.id, subtaskData);
                  setShowSubtaskForm(false);
                }}
                onClose={() => setShowSubtaskForm(false)}
              />
            </div>
          </td>
        </tr>
      )}
      {showDeleteConfirm && createPortal(
            <ConfirmationModal
              title="Delete Task and Subtasks"
              message={`Warning: This task contains ${task.subtasks.length} subtask${task.subtasks.length > 1 ? 's' : ''}. Deleting the main task will also delete all its subtasks. Would you like to proceed with deletion?`}
              confirmLabel="Both"
              secondaryAction={{
                label: "Keep Subtasks",
                onClick: () => {
                  onTaskDelete(task.id, false);
                  setShowDeleteConfirm(false);
                }
              }}
              isDestructive={true}
              confirmLabel="Delete All"
              onConfirm={() => {
                onTaskDelete(task.id, true);
                setShowDeleteConfirm(false);
              }}
              onCancel={() => setShowDeleteConfirm(false)}
            />,
            document.body
      )}
      {showDuplicateConfirm && createPortal(
            <ConfirmationModal
              title="Duplicate Task and Subtasks"
              message="This task contains subtasks. What would you like to duplicate?"
              confirmLabel="Both"
              secondaryAction={{
                label: "Task Only",
                onClick: () => {
                  onTaskDuplicate(task.id, false);
                  setShowDuplicateConfirm(false);
                }
              }}
              onConfirm={() => {
                onTaskDuplicate(task.id, true);
                setShowDuplicateConfirm(false);
              }}
              onCancel={() => setShowDuplicateConfirm(false)}
            />,
            document.body
      )}
      {showDetails && (
        createPortal(
          <TaskPanel
            task={task}
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            onTaskUpdate={onTaskUpdate} 
          />,
          document.body
        )
      )}
    </>
  );
}

interface TaskBoardProps {
  groups: TaskGroup[];
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskMove: (taskId: string, newGroupId: string) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskDuplicate: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTasksReorder: (tasks: Task[]) => void;
  onAddSubtask: (taskId: string, subtask: any) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

export function TaskBoard({
  groups,
  tasks,
  onTaskUpdate,
  onTaskMove,
  onTaskDelete,
  onTaskDuplicate,
  onTaskEdit,
  onTasksReorder,
  onAddSubtask,
  onToggleSubtask,
}: TaskBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Create a new array with the moved task
    const newTasks = arrayMove([...tasks], oldIndex, newIndex);
    
    // Calculate new order values for ALL tasks in the group
    const updatedTasks = newTasks.map((task, index) => {
      // Use a base order value of 1000 with increments of 1000
      const newOrder = (index + 1) * 1000;
      return { ...task, order: newOrder };
    });

    // Update local state
    onTasksReorder(updatedTasks);

    // Update the database
    updateTaskOrder(active.id as string, updatedTasks[newIndex].order, updatedTasks[newIndex].groupId)
      .catch(error => {
        console.error('Error updating task order:', error);
        onTasksReorder(tasks); // Revert on error
      });
  };
  return (
    <div className="overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[40%]">
                Task
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                Priority
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                Due Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                Assignee
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <SortableContext
              items={tasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  groups={groups}
                  onTaskUpdate={onTaskUpdate}
                  onTaskMove={onTaskMove}
                  onTaskDelete={onTaskDelete}
                  onTaskDuplicate={onTaskDuplicate}
                  onTaskEdit={onTaskEdit}
                  onAddSubtask={onAddSubtask}
                  onToggleSubtask={onToggleSubtask}
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </DndContext>
    </div>
  );
}