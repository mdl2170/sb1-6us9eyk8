import { createClient } from '@supabase/supabase-js';
import type { Task, TaskGroup, TaskResource, Profile } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Task Groups
export async function fetchTaskGroups(): Promise<TaskGroup[]> {
  const { data, error } = await supabase
    .from('task_groups')
    .select('*')
    .order('order');

  if (error) throw error;
  return data;
}

export async function createTaskGroup(group: Omit<TaskGroup, 'id'>): Promise<TaskGroup> {
  const { data, error } = await supabase
    .from('task_groups')
    .insert([group])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTaskGroup(id: string, updates: Partial<TaskGroup>): Promise<void> {
  const { error } = await supabase
    .from('task_groups')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteTaskGroup(id: string): Promise<void> {
  try {
    // First, get all tasks in this group
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('group_id', id);

    if (tasksError) throw tasksError;

    if (tasks && tasks.length > 0) {
      const taskIds = tasks.map(task => task.id);
      
      // Delete all resources for these tasks
      const { error: resourcesError } = await supabaseAdmin
        .from('task_resources')
        .delete()
        .in('task_id', taskIds);

      if (resourcesError) throw resourcesError;

      // Delete all subtasks
      const { error: subtasksError } = await supabaseAdmin
        .from('tasks')
        .delete()
        .in('parent_id', taskIds);

      if (subtasksError) throw subtasksError;

      // Delete main tasks
      const { error: tasksDeleteError } = await supabaseAdmin
        .from('tasks')
        .delete()
        .in('id', taskIds);

      if (tasksDeleteError) throw tasksDeleteError;
    }

    // Finally, delete the group
    const { error: groupError } = await supabaseAdmin
      .from('task_groups')
      .delete()
      .eq('id', id);

    if (groupError) throw groupError;
  } catch (error) {
    console.error('Error deleting task group:', error);
    throw error;
  }
}

// Tasks
export async function fetchTasks(): Promise<Task[]> {
  // Fetch main tasks
  const { data: mainTasks, error: mainTasksError } = await supabase
    .from('tasks')
    .select('*')
    .is('parent_id', null)
    .order('group_id', { ascending: true })
    .order('order', { ascending: true });

  if (mainTasksError) throw mainTasksError;

  // Fetch resources for main tasks
  const { data: mainTaskResources, error: mainResourcesError } = await supabase
    .from('task_resources')
    .select('*')
    .in('task_id', mainTasks.map(task => task.id));

  if (mainResourcesError) throw mainResourcesError;

  // Fetch subtasks
  const { data: subtasks, error: subtasksError } = await supabase
    .from('tasks')
    .select('*')
    .not('parent_id', 'is', null)
    .order('parent_id', { ascending: true })
    .order('order', { ascending: true });

  if (subtasksError) throw subtasksError;

  // Fetch resources for subtasks
  const { data: subtaskResources, error: subtaskResourcesError } = await supabase
    .from('task_resources')
    .select('*')
    .in('task_id', subtasks.map(subtask => subtask.id));

  if (subtaskResourcesError) throw subtaskResourcesError;

  // Transform and combine the data
  return mainTasks.map(task => ({
    ...task,
    groupId: task.group_id,
    resources: mainTaskResources?.filter(r => r.task_id === task.id) || [],
    subtasks: subtasks
      .filter(subtask => subtask.parent_id === task.id)
      .map(subtask => ({
        ...subtask,
        groupId: subtask.group_id,
        resources: subtaskResources?.filter(r => r.task_id === subtask.id) || [],
        tags: Array.isArray(subtask.tags) ? subtask.tags : [],
      })),
    tags: Array.isArray(task.tags) ? task.tags : [],
  }));
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'subtasks' | 'resources'>): Promise<Task> {
  const { groupId, ...rest } = task;

  // Get the group order
  const { data: group } = await supabase
    .from('task_groups')
    .select('order')
    .eq('id', groupId)
    .single();

  if (!group) throw new Error('Group not found');

  // Get the highest order among siblings
  const { data: maxOrderTask } = await supabase
    .from('tasks')
    .select('order')
    .eq('group_id', groupId)
    .is('parent_id', null)
    .order('order', { ascending: false, nulls_last: true })
    .limit(1);

  const baseOrder = 10000 * group.order;
  const currentMaxOrder = maxOrderTask?.[0]?.order ?? baseOrder - 1;
  const taskOrder = (currentMaxOrder % 10000) + 1;
  const nextOrder = baseOrder + taskOrder;

  const dbTask = {
    ...rest,
    due_date: rest.due_date || null,
    group_id: groupId,
    tags: rest.tags || [],
    parent_id: null,
    order: nextOrder
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert([dbTask])
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    groupId: data.group_id,
    subtasks: [],
    resources: [],
    tags: Array.isArray(data.tags) ? data.tags : [],
  };
}

export async function duplicateTaskResources(originalTaskId: string, newTaskId: string): Promise<void> {
  // Fetch original task's resources
  const { data: resources, error: fetchError } = await supabaseAdmin
    .from('task_resources')
    .select('*')
    .eq('task_id', originalTaskId);

  if (fetchError) throw fetchError;
  if (!resources || resources.length === 0) return;

  // Create new resources for the duplicated task
  const newResources = resources.map(resource => ({
    task_id: newTaskId,
    name: resource.name,
    type: resource.type,
    url: resource.url,
    size: resource.size,
    uploaded_at: new Date().toISOString(),
    uploaded_by: resource.uploaded_by,
  }));

  const { error: insertError } = await supabaseAdmin
    .from('task_resources')
    .insert(newResources);

  if (insertError) throw insertError;
}

export async function createSubtask(parentId: string, subtask: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'subtasks' | 'resources'>): Promise<Task> {
  const { groupId, ...rest } = subtask;
  
  // Get the group order
  const { data: group } = await supabase
    .from('task_groups')
    .select('order')
    .eq('id', groupId)
    .single();

  if (!group) throw new Error('Group not found');

  // Get the highest order among siblings
  const { data: maxOrderSubtask } = await supabase
    .from('tasks')
    .select('order')
    .eq('parent_id', parentId)
    .order('order', { ascending: false, nulls_last: true })
    .limit(1);

  const baseOrder = 10000 * group.order;
  const currentMaxOrder = maxOrderSubtask?.[0]?.order ?? baseOrder - 1;
  const subtaskOrder = (currentMaxOrder % 10000) + 1;
  const nextOrder = baseOrder + subtaskOrder;

  const dbSubtask = {
    ...rest,
    due_date: rest.due_date || null,
    group_id: groupId,
    tags: rest.tags || [],
    parent_id: parentId,
    order: nextOrder,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert([dbSubtask])
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    groupId: data.group_id,
    resources: [],
    tags: Array.isArray(data.tags) ? data.tags : [],
  };
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const { groupId, subtasks, resources, ...rest } = updates;
  const dbUpdates = {
    ...rest,
    group_id: groupId,
    updated_at: new Date().toISOString()
  };

  // Handle date fields
  if (dbUpdates.due_date && dbUpdates.due_date !== '') {
    dbUpdates.due_date = new Date(dbUpdates.due_date + 'T00:00:00Z').toISOString();
  } else {
    dbUpdates.due_date = null;
  }

  const { error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
}

export async function updateTaskOrder(taskId: string, newOrder: number, groupId: string): Promise<void> {
  try {
    // Get the group order
    const { data: group } = await supabase
      .from('task_groups')
      .select('order')
      .eq('id', groupId)
      .single();

    if (!group) throw new Error('Group not found');

    // Update the moved task's order
    const { error } = await supabase
      .from('tasks')
      .update({ order: newOrder })
      .eq('id', taskId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating task order:', error);
    throw error;
  }
}

export async function deleteTask(id: string, includeSubtasks: boolean = true): Promise<void> {
  try {
    // First, delete all resources
    const { error: resourcesError } = await supabaseAdmin
      .from('task_resources')
      .delete()
      .eq('task_id', id);

    if (resourcesError) throw resourcesError;

    if (includeSubtasks) {
      // Delete all subtasks and their resources
      const { data: subtasks } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('parent_id', id);

      if (subtasks && subtasks.length > 0) {
        const subtaskIds = subtasks.map(subtask => subtask.id);

        // Delete subtask resources
        const { error: subtaskResourcesError } = await supabaseAdmin
          .from('task_resources')
          .delete()
          .in('task_id', subtaskIds);

        if (subtaskResourcesError) throw subtaskResourcesError;

        // Delete subtasks
        const { error: subtasksError } = await supabaseAdmin
          .from('tasks')
          .delete()
          .in('id', subtaskIds);

        if (subtasksError) throw subtasksError;
      }
    } else {
      // Convert subtasks to main tasks by removing parent reference
      const { error: updateError } = await supabaseAdmin
        .from('tasks')
        .update({ parent_id: null })
        .eq('parent_id', id);

      if (updateError) throw updateError;
    }

    // Finally, delete the task itself
    const { error: taskError } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', id);

    if (taskError) throw taskError;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

// Task Resources
export async function createTaskResource(resource: Omit<TaskResource, 'id'>): Promise<TaskResource> {
  const { data, error } = await supabase
    .from('task_resources')
    .insert([resource])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadTaskFile(file: File, taskId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `tasks/${taskId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('task-resources')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('task-resources')
    .getPublicUrl(filePath);

  await createTaskResource({
    task_id: taskId,
    name: file.name,
    type: 'file',
    url: publicUrl,
    size: file.size,
    uploaded_at: new Date().toISOString(),
    uploaded_by: 'current_user',
  });

  return publicUrl;
}

export async function deleteTaskFile(url: string): Promise<void> {
  if (!url) return;

  try {
    const path = url.split('/task-resources/')[1];
    if (!path) return;

    const { error } = await supabase.storage
      .from('task-resources')
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

export async function deleteTaskResource(id: string): Promise<void> {
  const { error } = await supabase
    .from('task_resources')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Profile functions
export async function fetchProfile(userId: string) {
  try {
    // First get the base profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Based on role, fetch additional details
    if (profile.role === 'student') {
      const { data: student, error: studentError } = await supabaseAdmin
        .from('students')
        .select(`
          *,
          coach:coach_id(id, full_name, email),
          mentor:mentor_id(id, full_name, email)
        `)
        .eq('id', userId)
        .single();

      if (studentError) throw studentError;
      return { ...profile, ...student };

    } else if (profile.role === 'coach') {
      const { data: coach, error: coachError } = await supabaseAdmin
        .from('coaches')
        .select('*')
        .eq('id', userId)
        .single();

      if (coachError) throw coachError;
      return { ...profile, ...coach };

    } else if (profile.role === 'mentor') {
      const { data: mentor, error: mentorError } = await supabaseAdmin
        .from('mentors')
        .select('*')
        .eq('id', userId)
        .single();

      if (mentorError) throw mentorError;
      return { ...profile, ...mentor };
    }

    return profile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export async function updateStudentProfile(
  userId: string,
  updates: Partial<StudentProfile>
) {
  const { error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export async function updateAvatar(userId: string, file: File): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    await updateProfile(userId, { avatar_url: publicUrl });

    return publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

// Notification functions
export async function createNotification(notification: {
  user_id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert([notification]);

  if (error) throw error;
}

export async function createTaskNotification(
  userId: string,
  taskTitle: string,
  action: string,
  taskId: string
): Promise<void> {
  await createNotification({
    user_id: userId,
    title: `Task ${action}`,
    message: `Task "${taskTitle}" has been ${action.toLowerCase()}.`,
    type: 'task',
    link: `/progress?task=${taskId}`,
  });
}