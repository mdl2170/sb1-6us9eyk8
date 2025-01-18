import React, { useState } from 'react';
import { X, Calendar, Clock, Tag, User, Paperclip, Send, AtSign, Link, Upload, Trash2, Download } from 'lucide-react';
import { Task } from '../types';
import { USERS } from '../constants';
import { uploadTaskFile, createTaskResource, deleteTaskResource, deleteTaskFile, fetchTasks } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToastStore } from '../stores/useToastStore';

interface TaskPanelProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

interface Update {
  id: string;
  content: string;
  created_at: string;
  user: {
    name: string;
    avatar?: string;
  };
  mentions?: string[];
}

// Temporary mock data for updates
const mockUpdates: Update[] = [
  {
    id: '1',
    content: "Started working on the frontend implementation",
    created_at: "2024-01-17T10:00:00Z",
    user: {
      name: "Minh Le",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    }
  },
  {
    id: '2',
    content: "@Tony Duong Could you review the API integration?",
    created_at: "2024-01-17T11:30:00Z",
    user: {
      name: "Linh Pham",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    },
    mentions: ["Tony Duong"]
  }
];

export function TaskPanel({ task, isOpen, onClose, onTaskUpdate }: TaskPanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [updateContent, setUpdateContent] = useState('');
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { addToast } = useToastStore();
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleMention = (user: typeof USERS[0]) => {
    const beforeMention = updateContent.slice(0, cursorPosition).replace(/@\w*$/, '');
    const afterMention = updateContent.slice(cursorPosition);
    const newContent = `${beforeMention}@${user.name} ${afterMention}`;
    setUpdateContent(newContent);
    setShowMentions(false);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const value = textarea.value;
    const position = textarea.selectionStart;
    setCursorPosition(position);

    const lastWord = value.slice(0, position).split(' ').pop();
    if (lastWord?.startsWith('@')) {
      setMentionSearch(lastWord.slice(1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const filteredUsers = USERS.filter(user =>
    user.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFileUpload = async (file: File, setTask: React.Dispatch<React.SetStateAction<Task>>) => {
    try {
      const updatedTaskData = await uploadTaskFile(file, task.id, user?.id);
      setTask(prevTask => ({
        ...prevTask,
        resources: updatedTaskData.resources || []
      }));
      addToast('File uploaded successfully', 'success');
    } catch (error) {
      console.error('Error uploading file:', error);
      addToast('Failed to upload file', 'error');
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim() || !linkName.trim()) return;

    try {
      const result = await createTaskResource({
        task_id: task.id,
        name: linkName.trim(),
        type: 'link',
        url: linkUrl.trim(),
        size: 0,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.id,
      }, task.id);

      // Update task with the result that includes the new resource
      if (onTaskUpdate) {
        onTaskUpdate(task.id, result);
      }
      
      setLinkName('');
      setLinkUrl('');
      setShowLinkInput(false);
      addToast('Link added successfully', 'success');
    } catch (error) {
      console.error('Error adding link:', error);
      addToast('Failed to add link', 'error');
    }
  };

  const handleResourceDelete = async (resourceId: string, url: string) => {
    try {
      await deleteTaskFile(url);
      await deleteTaskResource(resourceId);
      
      // Refresh tasks to get updated resources
      const updatedTasks = await fetchTasks();
      const updatedTask = updatedTasks.find(t => t.id === task.id);
      
      if (updatedTask) {
        onTaskUpdate(task.id, updatedTask);
      }

      // Update the task's resources locally
      const updatedResources = task.resources.filter(r => r.id !== resourceId);
      onTaskUpdate(task.id, { ...task, resources: updatedResources });
      addToast('Resource deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting resource:', error);
      addToast('Failed to delete resource', 'error');
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform transition-transform ease-in-out duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">{task.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 border-b-2 text-sm font-medium ${
                activeTab === 'details'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`px-6 py-3 border-b-2 text-sm font-medium ${
                activeTab === 'updates'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Updates
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' ? (
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-2 text-sm text-gray-900">
                  {task.description || 'No description provided'}
                </p>
              </div>

              {/* Status and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-100 text-blue-800">
                    {task.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Priority</h3>
                  <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
                  <div className="mt-2 flex items-center text-sm text-gray-900">
                    <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                    {task.due_date ? formatDate(task.due_date) : 'No due date'}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <div className="mt-2 flex items-center text-sm text-gray-900">
                    <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
                    {formatDate(task.created_at)}
                  </div>
                </div>
              </div>

              {/* Assignee */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Assignee</h3>
                <div className="mt-2 flex items-center">
                  <User className="h-4 w-4 mr-1.5 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {task.assignee || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Tags</h3>
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
                </div>
              )}

              {/* Resources */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Resources</h3>
                <div className="mt-2 flex space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Upload className="h-4 w-4 mr-1.5" />
                    Upload File
                  </button>
                  <button
                    onClick={() => setShowLinkInput(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Link className="h-4 w-4 mr-1.5" />
                    Add Link
                  </button>
                </div>

                {showLinkInput && (
                  <form onSubmit={handleLinkSubmit} className="mt-3 space-y-3">
                    <input
                      type="text"
                      value={linkName}
                      onChange={(e) => setLinkName(e.target.value)}
                      placeholder="Link name"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowLinkInput(false)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Add Link
                      </button>
                    </div>
                  </form>
                )}

                {task.resources && task.resources.length > 0 ? (
                  <ul className="mt-2 border border-gray-200 rounded-md divide-y divide-gray-200">
                    {task.resources.map((resource) => (
                      <li key={resource.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                        <div className="w-0 flex-1 flex items-center">
                          {resource.type === 'link' ? (
                            <Link className="flex-shrink-0 h-5 w-5 text-gray-400" />
                          ) : (
                            <Paperclip className="flex-shrink-0 h-5 w-5 text-gray-400" />
                          )}
                          <span className="ml-2 flex-1 w-0 truncate">{resource.name}</span>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                          <a href={resource.url} className="font-medium text-indigo-600 hover:text-indigo-500">
                            {resource.type === 'link' ? (
                              <Link className="h-4 w-4" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </a>
                          <button
                            onClick={() => handleResourceDelete(resource.id, resource.url)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">No resources attached</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Updates List */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {mockUpdates.map((update) => (
                  <div key={update.id} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <img
                        className="h-10 w-10 rounded-full"
                        src={update.user.avatar}
                        alt={update.user.name}
                      />
                    </div>
                    <div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">{update.user.name}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        {update.content.split(' ').map((word, i) => (
                          word.startsWith('@') ? (
                            <span key={i} className="text-indigo-600 font-medium">{word} </span>
                          ) : (
                            word + ' '
                          )
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {formatDate(update.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Update Input */}
              <div className="border-t border-gray-200 p-4">
                <div className="relative">
                  <textarea
                    value={updateContent}
                    onChange={(e) => setUpdateContent(e.target.value)}
                    onKeyUp={handleKeyUp}
                    placeholder="Write an update... Use @ to mention someone"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    rows={3}
                  />
                  {showMentions && (
                    <div className="absolute bottom-full left-0 w-full mb-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleMention(user)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <AtSign className="h-4 w-4 text-gray-400" />
                          <span>{user.name}</span>
                          <span className="text-gray-400">({user.role})</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex justify-between items-center">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Post Update
                    </button>
                    <span className="text-xs text-gray-500">
                      Use @ to mention someone
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}