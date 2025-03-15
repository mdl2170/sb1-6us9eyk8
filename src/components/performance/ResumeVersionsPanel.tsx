import React, { useState } from 'react';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToastStore } from '../../stores/useToastStore';

interface ResumeVersion {
  id: string;
  version_number: number;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

interface Props {
  versions: ResumeVersion[];
  onUpdate: () => void;
  isStaff: boolean;
}

export function ResumeVersionsPanel({ versions, onUpdate, isStaff }: Props) {
  const { addToast } = useToastStore();
  const [reviewingVersion, setReviewingVersion] = useState<ResumeVersion | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const handleReviewSubmit = async (status: 'approved' | 'rejected') => {
    if (!reviewingVersion) return;

    try {
      setIsSubmitting(true);

      const { error } = await supabase.rpc('review_resume_version', {
        version_id: reviewingVersion.id,
        new_status: status,
        feedback_text: feedback
      });

      if (error) throw error;

      addToast('Resume review submitted successfully', 'success');
      setReviewingVersion(null);
      setFeedback('');
      onUpdate();
    } catch (err) {
      console.error('Error submitting review:', err);
      addToast('Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Needs Revision';
      default:
        return 'Pending Review';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Resume Versions</h3>
      
      {versions.length === 0 ? (
        <p className="text-gray-500">No resume versions uploaded yet.</p>
      ) : (
        <div className="space-y-4">
          {versions.map((version) => (
            <div key={version.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Version {version.version_number}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {new Date(version.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(version.status)}
                    <span className={`text-sm font-medium ${
                      version.status === 'approved' ? 'text-green-700' :
                      version.status === 'rejected' ? 'text-red-700' :
                      'text-yellow-700'
                    }`}>
                      {getStatusText(version.status)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {isStaff && version.status === 'pending' && (
                      <button
                        onClick={() => {
                          setReviewingVersion(version);
                          setShowReviewModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Review
                      </button>
                    )}
                    <a
                      href={version.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      View Resume
                    </a>
                  </div>
                </div>
              </div>

              {version.feedback && (
                <div className="mt-3 text-sm text-gray-600">
                  <p className="font-medium">Feedback:</p>
                  <p className="mt-1">{version.feedback}</p>
                </div>
              )}

              {showReviewModal && reviewingVersion?.id === version.id && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Review Resume - Version {version.version_number}
                    </h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                        Feedback
                      </label>
                      <textarea
                        id="feedback"
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Provide feedback for the resume..."
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingVersion(null);
                          setShowReviewModal(false);
                          setFeedback('');
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewSubmit('rejected')}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        disabled={isSubmitting}
                      >
                        Request Revision
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewSubmit('approved')}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        disabled={isSubmitting}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}