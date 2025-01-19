import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, Tag, User, Paperclip, Send, AtSign, Link, Upload, Trash2, Pencil, Save, Users } from 'lucide-react';
import { Task } from '../types';
import { USERS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { 
  createTaskResource, 
  uploadTaskFile, 
  deleteTaskResource, 
  deleteTaskFile,
  fetchTaskUpdates,
  createTaskUpdate,
  deleteTaskUpdate
} from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';

interface TaskPanelProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

interface TaskUpdate {
  id: string;
  content: string;
  created_at: string;
  created_by: {
    id: string;
    full_name: string;
    avatar_url?: string;
  }
  mentions?: string[];
}

export function TaskPanel({ task, isOpen, onClose, onTaskUpdate }: TaskPanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { addToast } = useToastStore();
  
  useEffect(() => {
    if (activeTab === 'updates') {
      loadUpdates();
    }
  }, [activeTab]);

  const loadUpdates = async () => {
    try {
      const data = await fetchTaskUpdates(task.id);
      if (!data) {
        setUpdates([]);
        return;
      }
      setUpdates(data);
    } catch (error) {
      console.error('Error loading updates:', error);
      addToast('Failed to load updates', 'error');
      setUpdates([]);
    }
  };

  const handlePostUpdate = async () => {
    if (!updateContent.trim() || !user) {
      addToast('Please enter some content', 'error');
      return;
    }

    try {
      setIsPostingUpdate(true);
      // Extract mentions from content
      const mentions = updateContent.match(/@(\w+\s+\w+)/g)?.map(m => m.slice(1)) || [];
      
      await createTaskUpdate(task.id, updateContent, mentions);
      setUpdateContent('');
      await loadUpdates();
      addToast('Update posted successfully', 'success');
    } catch (error) {
      console.error('Error posting update:', error);
      addToast('Failed to post update. Please try again.', 'error');
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    try {
      await deleteTaskUpdate(updateId);
      await loadUpdates();
      addToast('Update deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting update:', error);
      addToast('Failed to delete update', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resource = await uploadTaskFile(file, task.id);
      const updatedResources = [...task.resources, resource];
      onTaskUpdate(task.id, { resources: updatedResources });
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
        uploaded_by: user?.id || null,
      });

      const updatedResources = [...task.resources, result];
      onTaskUpdate(task.id, { resources: updatedResources });
      
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
      await deleteTaskResource(resourceId);
      if (url.includes('task-resources')) {
        await deleteTaskFile(url);
      }
      
      const updatedResources = task.resources.filter(r => r.id !== resourceId);
      onTaskUpdate(task.id, { resources: updatedResources });
      addToast('Resource deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting resource:', error);
      addToast('Failed to delete resource', 'error');
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
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
        
  return (
     <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-end">
      <div ref={panelRef}  className="fixed w-1/3 bg-white max-w-2xl h-full overflow-y-auto shadow-xl">
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
                    {task.due_date ? task.due_date.split('T')[0] : 'No due date'}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <div className="mt-2 flex items-center text-sm text-gray-900">
                    <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
                    {task.created_at.split('T')[0]}
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-gray-500">Resources</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload File
                    </button>
                    <button
                      onClick={() => setShowLinkInput(true)}
                      className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Link className="h-4 w-4 mr-1" />
                      Add Link
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                {showLinkInput && (
                  <form onSubmit={handleLinkSubmit} className="mb-4 space-y-3 bg-gray-50 p-3 rounded-md">
                    <div>
                      <label htmlFor="linkName" className="block text-sm font-medium text-gray-700">
                        Link Name
                      </label>
                      <input
                        type="text"
                        id="linkName"
                        value={linkName}
                        onChange={(e) => setLinkName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Enter link name"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-700">
                        URL
                      </label>
                      <input
                        type="url"
                        id="linkUrl"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="https://"
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowLinkInput(false)}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
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
                          <Paperclip className="flex-shrink-0 h-5 w-5 text-gray-400" />
                          <span className="ml-2 flex-1 w-0 truncate">{resource.name}</span>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex items-center space-x-4">
                          <a href={resource.url} className="font-medium text-indigo-600 hover:text-indigo-500">
                            {resource.type === 'link' ? 'Open Link' : 'Download'}
                          </a>
                          <button
                            onClick={() => handleResourceDelete(resource.id, resource.url)}
                            className="text-red-600 hover:text-red-800"
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
                {updates.map((update) => (
                  <div key={update.id} className="flex space-x-3">
                    <div className="flex-1 flex">
                      <div className="flex-shrink-0">
                        {update.created_by.avatar_url ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={update.created_by.avatar_url}
                            alt={update.created_by.full_name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-indigo-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">{update.created_by.full_name}</span>
                          </div>
                          {user?.id === update.created_by.id && (
                            <button
                              onClick={() => setShowDeleteConfirm(update.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
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
                    {showDeleteConfirm === update.id && (
                      <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Update?</h3>
                          <p className="text-sm text-gray-500 mb-6">
                            Are you sure you want to delete this update? This action cannot be undone.
                          </p>
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteUpdate(update.id)}
                              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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
                      onClick={handlePostUpdate}
                      disabled={!updateContent.trim() || isPostingUpdate}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {isPostingUpdate ? 'Posting...' : 'Post Update'}
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