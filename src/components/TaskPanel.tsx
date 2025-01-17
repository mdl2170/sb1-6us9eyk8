import React, { useEffect, useRef, useState } from 'react';
import { X, Calendar, Clock, Tag, User, Send, FileUp, Link2, Trash2, Download, File } from 'lucide-react';
import { Task, Subtask, TaskResource } from '../types';
import { uploadTaskFile, deleteTaskFile } from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';

interface TaskPanelProps {
  task: Task | Subtask;
  isOpen: boolean;
  onClose: () => void;
  onUpdateResources?: (resources: TaskResource[]) => void;
}

export function TaskPanel({ task, isOpen, onClose, onUpdateResources }: TaskPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newUpdate, setNewUpdate] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [showDriveInput, setShowDriveInput] = useState(false);
  const [resources, setResources] = useState<TaskResource[]>(task.resources || []);
  const { addToast } = useToastStore();
  const [updates, setUpdates] = useState<Update[]>([
    {
      id: '1',
      content: 'Changed status to In Progress',
      author: 'Minh Le',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      content: 'Added new subtask',
      author: 'Tony Duong',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSubmitUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUpdate.trim()) {
      const update: Update = {
        id: Math.random().toString(36).substr(2, 9),
        content: newUpdate.trim(),
        author: 'Minh Le',
        timestamp: new Date().toISOString(),
      };
      setUpdates([update, ...updates]);
      setNewUpdate('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      try {
        const publicUrl = await uploadTaskFile(file, task.id);
        const newResource: TaskResource = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: 'file',
          url: publicUrl,
          size: file.size,
          uploaded_at: new Date().toISOString(),
          uploaded_by: 'Minh Le',
        };
        setResources([...resources, newResource]);
        
        if (onUpdateResources) {
          onUpdateResources([...resources, newResource]);
        }
        addToast('File uploaded successfully', 'success');
      } catch (error) {
        console.error('Error uploading file:', error);
        if (typeof error === 'object' && error !== null && 'message' in error) {
          addToast((error as Error).message, 'error');
        } else {
          addToast('Failed to upload file', 'error');
        }
      }
    }
  };

  const handleDriveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (driveUrl.trim()) {
      const newResource: TaskResource = {
        id: Math.random().toString(36).substr(2, 9),
        name: 'Google Drive File',
        type: 'drive',
        url: driveUrl.trim(),
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'Minh Le',
      };
      setResources([...resources, newResource]);
      if (onUpdateResources) {
        onUpdateResources([...resources, newResource]);
      }
      setDriveUrl('');
      setShowDriveInput(false);
      addToast('Drive link added successfully', 'success');
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    if (resource) {
      try {
        if (resource.type === 'file') {
          await deleteTaskFile(resource.url);
        }
        const updatedResources = resources.filter(r => r.id !== resourceId);
        setResources(updatedResources);
        
        if (onUpdateResources) {
          onUpdateResources(updatedResources);
        }
        addToast('Resource deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting resource:', error);
        if (typeof error === 'object' && error !== null && 'message' in error) {
          addToast((error as Error).message, 'error');
        } else {
          addToast('Failed to delete resource', 'error');
        }
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-500 bg-opacity-25 transition-opacity" />
      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="pointer-events-auto w-screen max-w-2xl">
          <div ref={panelRef} className="flex h-full flex-col overflow-hidden bg-white shadow-xl">
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 sm:px-8">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                    {task.description && (
                      <p className="mt-2 text-sm text-gray-500">{task.description}</p>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="mt-1 text-sm text-gray-900 capitalize">{task.status}</dd>
                      </div>

                      <div>
                        <dt className="text-sm font-medium text-gray-500">Priority</dt>
                        <dd className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </dd>
                      </div>

                      {task.assignee && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Assignee</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              {task.assignee}
                            </div>
                          </dd>
                        </div>
                      )}

                      {task.due_date && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          </dd>
                        </div>
                      )}

                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            {new Date(task.created_at).toLocaleDateString()}
                          </div>
                        </dd>
                      </div>

                      {'tags' in task && task.tags.length > 0 && (
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Tags</dt>
                          <dd className="mt-1">
                            <div className="flex flex-wrap gap-2">
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
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Resources Section */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Resources</h3>
                  
                  <div className="flex space-x-4 mb-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Upload File
                    </button>
                    <button
                      onClick={() => setShowDriveInput(true)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Add Drive Link
                    </button>
                  </div>

                  {showDriveInput && (
                    <form onSubmit={handleDriveLink} className="mb-4">
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={driveUrl}
                          onChange={(e) => setDriveUrl(e.target.value)}
                          placeholder="Paste Google Drive link here"
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDriveInput(false)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2">
                    {resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <File className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {resource.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {resource.size && formatFileSize(resource.size)} • 
                              Added {formatTimestamp(resource.uploaded_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => window.open(resource.url, '_blank')}
                            className="p-1 text-gray-400 hover:text-gray-500"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteResource(resource.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {resources.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No resources attached to this task
                      </div>
                    )}
                  </div>
                </div>

                {/* Updates Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Updates</h3>
                  
                  {/* New Update Form */}
                  <form onSubmit={handleSubmitUpdate} className="mb-6">
                    <div className="flex items-start space-x-4">
                      <div className="min-w-0 flex-1">
                        <div className="border border-gray-300 rounded-lg shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                          <textarea
                            rows={3}
                            name="comment"
                            id="comment"
                            className="block w-full py-3 px-4 border-0 resize-none focus:ring-0 sm:text-sm"
                            placeholder="Add an update..."
                            value={newUpdate}
                            onChange={(e) => setNewUpdate(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </form>

                  {/* Updates List */}
                  <div className="flow-root">
                    <ul role="list" className="-mb-8">
                      {updates.map((update, updateIdx) => (
                        <li key={update.id}>
                          <div className="relative pb-8">
                            {updateIdx !== updates.length - 1 ? (
                              <span
                                className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            ) : null}
                            <div className="relative flex items-start space-x-3">
                              <div className="relative">
                                <div className="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center">
                                  <span className="text-white font-medium text-sm">
                                    {update.author.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div>
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-900">
                                      {update.author}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-sm text-gray-500">
                                    {formatTimestamp(update.timestamp)}
                                  </p>
                                </div>
                                <div className="mt-2 text-sm text-gray-700">
                                  <p>{update.content}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Update {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}