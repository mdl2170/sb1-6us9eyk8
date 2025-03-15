import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useSelectedStudentStore } from '../../stores/useSelectedStudentStore';
import { supabase } from '../../lib/supabase';
import { Upload, FileUp, X, FileText, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { ResumeVersion } from '../../types';

export function ResumeUploadPanel({ studentId }: { studentId: string }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { selectedStudent } = useSelectedStudentStore();
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ResumeVersion | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    await handleFileUpload(file);
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);

      const targetStudentId = user?.role === 'student' ? user.id : selectedStudent;
      if (!targetStudentId) return;

      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        addToast('Please upload a PDF or Word document', 'error');
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        addToast('File size must be less than 10MB', 'error');
        return;
      }

      // Get next version number 
      const { data: versionData } = await supabase
        .rpc('get_next_resume_version', { student_id: targetStudentId });

      const versionNumber = versionData || 1;

      // Upload file to storage
      const fileName = `${targetStudentId}/${versionNumber}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      // Create resume version record
      const { error: versionError } = await supabase
        .from('resume_versions')
        .insert({
          student_id: targetStudentId,
          version_number: versionNumber,
          file_url: publicUrl,
          status: 'pending'
        });

      if (versionError) throw versionError;

      // Reload versions
      const { data: versions, error: loadError } = await supabase
        .from('resume_versions')
        .select('*')
        .eq('student_id', targetStudentId)
        .order('version_number', { ascending: false });

      if (loadError) throw loadError;
      setVersions(versions || []);

      addToast('Resume uploaded successfully', 'success');
    } catch (err) {
      console.error('Error uploading resume:', err);
      addToast('Failed to upload resume', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await handleFileUpload(files[0]);
  };

  useEffect(() => {
    const loadResumes = async () => {
      try {
        const targetStudentId = user?.role === 'student' ? user.id : selectedStudent;
        if (!targetStudentId) {
          setVersions([]);
          return;
        }

        setIsLoading(true);

        const { data, error } = await supabase
          .from('resume_versions')
          .select('*')
          .eq('student_id', targetStudentId)
          .order('version_number', { ascending: false });

        if (error) throw error;
        setVersions(data || []);
      } catch (err) {
        console.error('Error loading resumes:', err);
        addToast('Failed to load resumes', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadResumes();
  }, [user, selectedStudent]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      {/* Resume Upload Area */}
      {(user?.role === 'student' || selectedStudent) && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <Upload className="h-12 w-12 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-600">
                Drag and drop your resume here, or{' '}
                <label className="text-indigo-600 hover:text-indigo-500 cursor-pointer">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500 mt-1">PDF, DOC, or DOCX up to 10MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Resume Versions List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : versions.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Resume Versions</h3>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {versions.map((version) => (
                <li key={version.id} className="px-4 py-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          Version {version.version_number}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          version.status === 'approved' ? 'bg-green-100 text-green-800' :
                          version.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {version.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={version.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          View
                        </a>
                        {user?.role === 'student' && version.status === 'pending' && !isUploading && (
                          <button
                            onClick={() => handleDelete(version)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                        {['coach', 'mentor', 'admin'].includes(user?.role || '') && 
                         version.status === 'pending' && !isUploading && (
                          <button
                            onClick={() => {
                              setSelectedVersion(version);
                              setIsReviewing(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                    {version.feedback && (
                      <div className="mt-2 text-sm text-gray-500">
                        <p className="font-medium">Feedback:</p>
                        <p>{version.feedback}</p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : !isLoading && (user?.role === 'student' || selectedStudent) ? (
        <div className="text-center py-8 text-gray-500">
          No resume versions uploaded yet.
        </div>
      ) : null}

      {/* Review Modal */}
      {isReviewing && selectedVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Review Resume</h3>
              <button
                onClick={() => {
                  setSelectedVersion(null);
                  setIsReviewing(false);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Feedback
                </label>
                <textarea
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  rows={4}
                  placeholder="Enter your feedback..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleReviewSubmit(selectedVersion, 'rejected')}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleReviewSubmit(selectedVersion, 'approved')}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}