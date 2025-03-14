import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Upload, FileText, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useToastStore } from '../../stores/useToastStore';
import type { ResumeVersion } from '../../types';

export function ResumeUploadPanel() {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);

  useEffect(() => {
    const loadResumes = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('resume_versions')
          .select('*')
          .eq('student_id', user?.id)
          .order('version_number', { ascending: false });

        if (error) throw error;
        setVersions(data || []);
      } catch (error) {
        console.error('Error loading resumes:', error);
        addToast('Error loading resumes', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadResumes();
    }
  }, [user]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.includes('pdf')) {
        addToast('Please upload a PDF file', 'error');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        addToast('File size must be less than 5MB', 'error');
        return;
      }

      setIsUploading(true);
      
      // Generate a unique filename with student ID and timestamp
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${timestamp}.${fileExt}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // Get next version number
      const { data: version, error: versionError } = await supabase.rpc(
        'get_next_resume_version',
        { student_id: user.id }
      );

      if (versionError) {
        throw versionError;
      }

      // Create resume version record
      const { error: insertError } = await supabase
        .from('resume_versions')
        .insert({
          student_id: user.id,
          version_number: version,
          file_url: publicUrl,
          status: 'pending'
        });

      if (insertError) {
        // Cleanup uploaded file if version creation fails
        await supabase.storage
          .from('resumes')
          .remove([filePath]);
        throw insertError;
      }

      addToast('Resume uploaded successfully', 'success');
      loadResumes();
    } catch (error) {
      console.error('Error uploading resume:', error);
      addToast('Error uploading resume: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDelete = async (version: ResumeVersion) => {
    try {
      // Extract filename from URL
      const filename = version.file_url.split('/').pop();
      if (!filename) {
        throw new Error('Invalid file URL');
      }

      // Delete file from storage
      const { error: storageError } = await supabase.storage.from('resumes')
        .remove([`${user?.id}/${filename}`]);

      // Continue with database deletion even if storage deletion fails
      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }

      // Delete version from database
      const { error: dbError } = await supabase.from('resume_versions')
        .delete()
        .eq('id', version.id)
        .eq('student_id', user?.id);
      
      if (dbError) throw dbError;

      // Update local state
      setVersions(prevVersions => prevVersions.filter(v => v.id !== version.id));
      addToast('Resume deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting resume:', error);
      addToast('Error deleting resume', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-yellow-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Resume</h2>
        <div className="flex items-center space-x-4">
          <label className="relative cursor-pointer">
            <input
              type="file"
              className="sr-only"
              accept=".pdf"
              onChange={handleUpload}
              disabled={isUploading}
            />
            <div className={`
              flex items-center justify-center px-4 py-2 border border-gray-300 
              rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white 
              hover:bg-gray-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}>
              <Upload className="h-5 w-5 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload PDF'}
            </div>
          </label>
          <p className="text-sm text-gray-500">
            Maximum file size: 5MB. PDF format only.
          </p>
        </div>
      </div>

      {/* Versions List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Resume Versions</h2>
        {versions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No resume versions uploaded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(version.status)}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Version {version.version_number}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(version.created_at).toLocaleDateString()}
                    </p>
                    {version.feedback && (
                      <p className="text-sm text-gray-600 mt-1">
                        Feedback: {version.feedback}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`text-sm font-medium ${getStatusColor(version.status)} capitalize`}>
                    {version.status}
                  </span>
                  <a
                    href={version.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                  >
                    View
                  </a>
                  {version.status === 'pending' && (
                    <button
                      onClick={() => handleDelete(version)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}