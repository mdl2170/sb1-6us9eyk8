import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Upload } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '../lib/supabase';
import { arrayMove } from '@dnd-kit/sortable';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<TaskGroupType[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToastStore();
  
  // Load students for staff members
  useEffect(() => {
    if (user?.role !== 'student') {
      const loadStudents = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .order('full_name');

          if (error) throw error;
          setStudents(data || []);
        } catch (err) {
          console.error('Error loading students:', err);
          addToast('Failed to load students', 'error');
        }
      };

      loadStudents();
    }
  }, [user]);

  // Filter tasks based on role and selected student
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

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

    return filtered.filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
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
        created_by: user?.id
      };

      const newTask = await createTask(taskData);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksData, groupsData] = await Promise.all([
        fetchTasks(),
        fetchTaskGroups(
          user?.role === 'student' ? user.id : selectedStudent
        ),
      ]);
      setTasks(tasksData);
      setGroups(groupsData);
    } catch (err) {
      console.error('Error loading data:', err);
      addToast('Failed to load data', 'error');
    }
  };

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
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Task</h1>
          {user?.role !== 'student' && (
            <SearchableSelect
              options={students.map(s => ({ value: s.id, label: s.full_name }))}
              value={selectedStudent || ''}
              onChange={setSelectedStudent}
              placeholder="Select student..."
              className="w-64"
            />
          )}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="h-5 w-5 mr-2" />
              Import Tasks
            </button>
            <button
              onClick={handleGroupCreate}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Group
            </button>
            <button
              onClick={() => setShowTaskForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Task
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
}