import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Upload } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '../lib/supabase';
import { arrayMove } from '@dnd-kit/sortable';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSelectedStudentStore } from '../stores/useSelectedStudentStore';
import { duplicateTaskResources } from '../lib/supabase';
import { SearchableSelect } from '../components/SearchableSelect';
import { useAuth } from '../hooks/useAuth';
import { TaskGroup } from '../components/TaskGroup';
import { TaskForm } from '../components/TaskForm';
import { ImportTaskModal } from '../components/ImportTaskModal';
import { TaskOverview } from '../components/TaskOverview';
import { Task, TaskGroup as TaskGroupType } from '../types';
import { useToastStore } from '../stores/useToastStore';
import {
  fetchTasks,
  fetchTaskGroups,
  createTask,
  updateTask,
  deleteTask,
  createTaskGroup,
  updateTaskGroup,
  deleteTaskGroup,
  createSubtask,
} from '../lib/supabase';

export function TaskManagement() {
  const { user } = useAuth();
  const { selectedStudent, setSelectedStudent } = useSelectedStudentStore();
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<TaskGroupType[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(true);
 
  // Load students for staff members
  useEffect(() => {
    if (user?.role !== 'student') {
      const loadStudents = async () => {
        try {
          let query = supabase
            .from('students')
            .select(`
              id,
              profile:profiles!students_id_fkey (
                id,
                full_name
              )
            `)
            .order('profile(full_name)');

          // Filter by coach_id or mentor_id based on user role
          if (user?.role === 'coach') {
            query = query.eq('coach_id', user.id);
          } else if (user?.role === 'mentor') {
            query = query.eq('mentor_id', user.id);
          }

          const { data, error } = await query;

          if (error) throw error;

          setStudents(data?.map(student => ({
            id: student.profile.id,
            full_name: student.profile.full_name
          })) || []);
        } catch (err) {
          console.error('Error loading students:', err);
          addToast('Failed to load students', 'error');
        }
      };

      loadStudents();
    }
  }, [user]);

  // Load tasks data
  useEffect(() => {
    if (user?.role === 'student' || selectedStudent) {
      loadData();
    }
  }, [user, selectedStudent]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tasksData, groupsData] = await Promise.all([
        fetchTasks(),
        fetchTaskGroups(
          user?.role === 'student' ? user.id : selectedStudent
        ),
      ]);
      setTasks(tasksData);
      setGroups(groupsData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      addToast('Failed to load data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tasks based on role and selected student
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    const query = searchQuery.toLowerCase().trim();

    if (user?.role === 'student') {
      filtered = tasks.filter(task => 
        task.created_by === user.id ||
        task.assignee === user.full_name
      );
    } else if (selectedStudent) {
      const student = students.find(s => s.id === selectedStudent);
      if (student) {
        filtered = tasks.filter(task =>
          task.created_by === selectedStudent || 
          task.assignee === student.full_name
        );
      }
    }

    if (query) {
      filtered = filtered.filter(task => {
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query) || false;
        const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(query)) || false;
        const matchesAssignee = task.assignee?.toLowerCase().includes(query) || false;
        const matchesStatus = task.status.toLowerCase().includes(query);
        
        // Also search in subtasks
        const matchesSubtasks = task.subtasks.some(subtask => 
          subtask.title.toLowerCase().includes(query) ||
          subtask.description?.toLowerCase().includes(query) ||
          subtask.tags?.some(tag => tag.toLowerCase().includes(query)) ||
          subtask.assignee?.toLowerCase().includes(query) ||
          subtask.status.toLowerCase().includes(query)
        );

        return matchesTitle || matchesDescription || matchesTags || matchesAssignee || matchesStatus || matchesSubtasks;
      });
    }

    return filtered;
  }, [tasks, user, selectedStudent, students, searchQuery]);

  // Get assignable users based on role
  const getAssignableUsers = async () => {
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

        const assignableUsers = [
          { id: user.id, full_name: user.full_name }
        ];

        if (studentData.coach) {
          assignableUsers.push(studentData.coach);
        }
        if (studentData.mentor) {
          assignableUsers.push(studentData.mentor);
        }

        return assignableUsers;
      } else {
        // For staff, return all users
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .order('full_name');

        if (error) throw error;
        return data;
      }
    } catch (err) {
      console.error('Error getting assignable users:', err);
      addToast('Failed to get assignable users', 'error');
      return [];
    }
  };

  const handleTaskCreate = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'subtasks' | 'resources'>) => {
    try {
      // Add created_by field
      const taskWithCreator = {
        ...taskData,
        created_by: user?.id || ''
      };

      const newTask = await createTask(taskWithCreator);
      setTasks(prevTasks => [newTask, ...prevTasks]);
      addToast('Task created successfully', 'success');
    } catch (err) {
      console.error('Error creating task:', err);
      addToast('Failed to create task', 'error');
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates);
      setTasks(prevTasks => {
        return prevTasks.map(task => {
          if (task.id === taskId) {
            return { ...task, ...updates, updated_at: new Date().toISOString() };
          }
          if (task.subtasks.some(subtask => subtask.id === taskId)) {
            return {
              ...task,
              subtasks: task.subtasks.map(subtask =>
                subtask.id === taskId
                  ? { ...subtask, ...updates, updated_at: new Date().toISOString() }
                  : subtask
              ),
            };
          }
          return task;
        });
      });
      addToast('Task updated successfully', 'success');
    } catch (err) {
      console.error('Error updating task:', err);
      addToast('Failed to update task', 'error');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleGroupCreate = async () => {
    try {
      // Update orders of existing groups
      const updatedGroups = groups.map(group => ({
        ...group,
        order: group.order + 1
      }));
      
      // Create new group with order 0
      const newGroup = await createTaskGroup({
        title: 'New Group',
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        order: 0,
        owner_id: user?.role === 'student' ? user.id : selectedStudent
      });

      // Update orders in database
      await Promise.all(updatedGroups.map(group => 
        updateTaskGroup(group.id, { order: group.order })
      ));

      // Update state with new order
      setGroups([newGroup, ...updatedGroups]);
      addToast('Group created successfully', 'success');
    } catch (err) {
      console.error('Error creating group:', err);
      addToast('Failed to create group', 'error');
    }
  };

  const handleGroupUpdate = async (groupId: string, updates: Partial<TaskGroupType>) => {
    try {
      await updateTaskGroup(groupId, updates);
      setGroups(prevGroups => 
        prevGroups.map(group =>
          group.id === groupId ? { ...group, ...updates } : group
        )
      );
      addToast('Group updated successfully', 'success');
    } catch (err) {
      console.error('Error updating task:', err);
      addToast('Failed to update group', 'error');
    }
  };

  const handleGroupDelete = async (groupId: string) => {
    try {
      await deleteTaskGroup(groupId);
      setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
      setTasks(prevTasks => prevTasks.filter(task => task.groupId !== groupId));
      addToast('Group deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting group:', err);
      addToast('Failed to delete group', 'error');
    }
  };

  const handleTaskMove = async (taskId: string, newGroupId: string) => {
    try {
      await updateTask(taskId, { groupId: newGroupId });
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, groupId: newGroupId } : task
        )
      );
      addToast('Task moved successfully', 'success');
    } catch (err) {
      console.error('Error moving task:', err);
      addToast('Failed to move task', 'error');
    }
  };

  const handleTaskDelete = async (taskId: string, includeSubtasks: boolean = true) => {
    try {
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) throw new Error('Task not found');

      await deleteTask(taskId, includeSubtasks);

      setTasks(prevTasks => {
        if (includeSubtasks) {
          // Remove the task and its subtasks
          return prevTasks.filter(task => task.id !== taskId);
        } else {
          // Convert subtasks to main tasks
          const convertedSubtasks = taskToDelete.subtasks.map(subtask => ({
            ...subtask,
            parent_id: null,
            subtasks: [],
          }));
          
          // Remove the original task and add converted subtasks
          return [
            ...prevTasks.filter(task => task.id !== taskId),
            ...convertedSubtasks
          ];
        }
      });

      addToast('Task deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting task:', err);
      addToast('Failed to delete task', 'error');
    }
  };

  const handleTaskDuplicate = async (taskId: string, includeSubtasks: boolean = true) => {
    try {
      const taskToDuplicate = tasks.find(task => task.id === taskId);
      let parentTask;

      if (!taskToDuplicate) {
        // Check if it's a subtask
        for (const task of tasks) {
          const subtask = task.subtasks.find(s => s.id === taskId);
          if (subtask) {
            parentTask = task;
            const { id, created_at, updated_at, resources, ...subtaskData } = subtask;
            const newSubtask = await createSubtask(task.id, {
              ...subtaskData,
              title: `${subtaskData.title} (Copy)`,
              groupId: task.groupId,
            });
            
            // Duplicate resources for the subtask
            await duplicateTaskResources(subtask.id, newSubtask.id);
            
            setTasks(prevTasks => prevTasks.map(t => {
              if (t.id === task.id) {
                return {
                  ...t,
                  subtasks: [...t.subtasks, {
                    ...newSubtask,
                    groupId: newSubtask.group_id,
                    resources: subtask.resources,
                    tags: Array.isArray(newSubtask.tags) ? newSubtask.tags : [],
                  }],
                };
              }
              return t;
            }));
            
            addToast('Subtask duplicated successfully', 'success');
            return;
          }
        }
        throw new Error('Task not found');
      } else {
        const { id, created_at, updated_at, resources, subtasks, parent_id, group_id, ...taskData } = taskToDuplicate;
        const newTask = await createTask({
          ...taskData,
          title: `${taskData.title} (Copy)`,
          groupId: taskData.groupId,
        });
        
        // Duplicate resources for the main task
        await duplicateTaskResources(taskToDuplicate.id, newTask.id);
        
        // If includeSubtasks is true, duplicate all subtasks
        let newSubtasks = [];
        if (includeSubtasks && taskToDuplicate.subtasks.length > 0) {
          newSubtasks = await Promise.all(
            taskToDuplicate.subtasks.map(async (subtask) => {
              const { id, created_at, updated_at, resources, group_id, ...subtaskData } = subtask;
              const newSubtask = await createSubtask(newTask.id, {
                ...subtaskData,
                title: `${subtaskData.title} (Copy)`,
                groupId: newTask.group_id,
              });
              
              // Duplicate resources for the subtask
              await duplicateTaskResources(subtask.id, newSubtask.id);
              
              return {
                ...newSubtask,
                groupId: newSubtask.group_id,
                resources: subtask.resources,
                tags: Array.isArray(newSubtask.tags) ? newSubtask.tags : [],
              };
            })
          );
        }

        setTasks(prevTasks => [{
          ...newTask,
          groupId: newTask.group_id,
          resources: taskToDuplicate.resources,
          subtasks: newSubtasks,
          tags: Array.isArray(newTask.tags) ? newTask.tags : [],
        }, ...prevTasks]);
        
        addToast(
          includeSubtasks && taskToDuplicate.subtasks.length > 0
            ? 'Task and subtasks duplicated successfully'
            : 'Task duplicated successfully',
          'success'
        );
      }
    } catch (err) {
      console.error('Error duplicating task:', err);
      addToast('Failed to duplicate task', 'error');
    }
  };

  const handleAddSubtask = async (taskId: string, subtaskData: any) => {
    try {
      const parentTask = tasks.find(task => task.id === taskId);
      if (!parentTask) {
        throw new Error('Parent task not found');
      }

      const newSubtask = await createSubtask(taskId, {
        ...subtaskData,
        group_id: parentTask.groupId,
      });

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { ...task, subtasks: [...task.subtasks, {
                ...newSubtask,
                groupId: newSubtask.group_id,
                resources: [],
                tags: Array.isArray(newSubtask.tags) ? newSubtask.tags : [],
              }]}
            : task
        )
      );
      addToast('Subtask added successfully', 'success');
    } catch (err) {
      console.error('Error adding subtask:', err);
      addToast('Failed to add subtask', 'error');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = groups.findIndex((group) => group.id === active.id);
      const newIndex = groups.findIndex((group) => group.id === over.id);

      const newGroups = arrayMove(groups, oldIndex, newIndex);
      setGroups(newGroups);

      // Update the order in the database
      newGroups.forEach((group, index) => {
        updateTaskGroup(group.id, { order: index });
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 -mt-8 -mx-8 -mb-8">
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Task Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage and track tasks for better productivity
        </p>

        {user?.role !== 'student' && (
          <div className="bg-white shadow rounded-lg mt-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Please select a student</h2>
              <p className="mt-1 text-sm text-gray-500">
                Choose a student from the dropdown below to view and manage their tasks
              </p>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <SearchableSelect
                  options={students.map(s => ({ value: s.id, label: s.full_name }))}
                  value={selectedStudent || ''}
                  onChange={setSelectedStudent}
                  placeholder="Select student..."
                  className="w-48"
                />
                {selectedStudent && (
                  <>
                    <div className="relative">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 whitespace-nowrap"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Import Tasks
                    </button>
                    <button
                      onClick={handleGroupCreate}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 whitespace-nowrap"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Group
                    </button>
                    <button
                      onClick={() => setShowTaskForm(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Task
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (user?.role === 'student' || selectedStudent) ? (
          <>
            <TaskOverview tasks={filteredTasks} />

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <SortableContext
                items={groups.map(group => group.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-6">
                  {groups.map((group) => (
                    <TaskGroup
                      key={group.id}
                      group={group}
                      tasks={filteredTasks.filter((task) => task.groupId === group.id)}
                      onTaskUpdate={handleTaskUpdate}
                      onTaskMove={handleTaskMove}
                      onTaskDelete={handleTaskDelete}
                      onTaskDuplicate={handleTaskDuplicate}
                      onTaskEdit={setEditingTask}
                      onTasksReorder={(reorderedTasks) => setTasks(reorderedTasks)}
                      onAddSubtask={handleAddSubtask}
                      onToggleSubtask={(taskId, subtaskId) => {
                        handleTaskUpdate(subtaskId, {
                          status: 'completed',
                        });
                      }}
                      onGroupDelete={handleGroupDelete}
                      onGroupUpdate={handleGroupUpdate}
                      onAddTask={() => setShowTaskForm(true)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {(showTaskForm || editingTask) && (
              <TaskForm
                groups={groups}
                initialData={editingTask}
                onSubmit={(taskData) => {
                  if (editingTask) {
                    handleTaskUpdate(editingTask.id, taskData);
                  } else {
                    handleTaskCreate(taskData);
                  }
                  setShowTaskForm(false);
                  setEditingTask(null);
                }}
                onCancel={() => {
                  setShowTaskForm(false);
                  setEditingTask(null);
                }}
              />
            )}

            {showImportModal && (
              <ImportTaskModal
                onClose={() => setShowImportModal(false)}
                onImport={async (tasksToImport) => {
                  try {
                    const createdTasks = await Promise.all(
                      tasksToImport.map(task => createTask(task))
                    );
                    setTasks(prevTasks => [...createdTasks, ...prevTasks]);
                    addToast('Tasks imported successfully', 'success');
                    setShowImportModal(false);
                  } catch (err) {
                    console.error('Error importing tasks:', err);
                    addToast('Failed to import tasks', 'error');
                  }
                }}
                groups={groups}
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}