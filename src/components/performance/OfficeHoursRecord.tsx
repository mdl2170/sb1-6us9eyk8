import React, { useState } from 'react';
import { createOfficeHoursRecord } from '../../lib/supabase';
import { useToastStore } from '../../stores/useToastStore';
import { AlertCircle, Clock, Video, FileText, CheckSquare } from 'lucide-react';
import type { OfficeHoursRecord } from '../../types';

interface OfficeHoursRecordFormProps {
  studentId: string;
  coachId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OfficeHoursRecordForm({
  studentId,
  coachId,
  onSuccess,
  onCancel,
}: OfficeHoursRecordFormProps) {
  const { addToast } = useToastStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [record, setRecord] = useState<Omit<OfficeHoursRecord, 'id' | 'created_at' | 'updated_at'>>({
    student_id: studentId,
    coach_id: coachId,
    session_date: new Date().toISOString(),
    duration_minutes: 30,
    recording_url: '',
    meeting_notes: '',
    topics_covered: [],
    action_items: [],
  });

  const [newTopic, setNewTopic] = useState('');
  const [newActionItem, setNewActionItem] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');

      await createOfficeHoursRecord(record);
      addToast('Office hours record created successfully', 'success');
      onSuccess();
    } catch (err) {
      console.error('Error creating office hours record:', err);
      setError(err instanceof Error ? err.message : 'Failed to create office hours record');
      addToast('Failed to create office hours record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTopic = () => {
    if (newTopic.trim()) {
      setRecord({
        ...record,
        topics_covered: [...record.topics_covered, newTopic.trim()],
      });
      setNewTopic('');
    }
  };

  const removeTopic = (index: number) => {
    setRecord({
      ...record,
      topics_covered: record.topics_covered.filter((_, i) => i !== index),
    });
  };

  const addActionItem = () => {
    if (newActionItem.trim()) {
      setRecord({
        ...record,
        action_items: [...record.action_items, newActionItem.trim()],
      });
      setNewActionItem('');
    }
  };

  const removeActionItem = (index: number) => {
    setRecord({
      ...record,
      action_items: record.action_items.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />

        {/* Panel */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Session Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900">Session Details</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Session Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={record.session_date.slice(0, 16)}
                      onChange={(e) => setRecord({ ...record, session_date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={record.duration_minutes}
                      onChange={(e) => setRecord({ ...record, duration_minutes: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Recording URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Recording URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                    <Video className="h-4 w-4" />
                  </span>
                  <input
                    type="url"
                    value={record.recording_url}
                    onChange={(e) => setRecord({ ...record, recording_url: e.target.value })}
                    placeholder="https://..."
                    className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Topics Covered */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Topics Covered
                </label>
                <div className="mt-1">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                      placeholder="Add a topic..."
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={addTopic}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {record.topics_covered.map((topic, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                        <span className="text-sm text-gray-700">{topic}</span>
                        <button
                          type="button"
                          onClick={() => removeTopic(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Action Items
                </label>
                <div className="mt-1">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newActionItem}
                      onChange={(e) => setNewActionItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addActionItem())}
                      placeholder="Add an action item..."
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={addActionItem}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {record.action_items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                        <span className="text-sm text-gray-700">{item}</span>
                        <button
                          type="button"
                          onClick={() => removeActionItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Meeting Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meeting Notes
                </label>
                <textarea
                  value={record.meeting_notes}
                  onChange={(e) => setRecord({ ...record, meeting_notes: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Add detailed notes from the session..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}