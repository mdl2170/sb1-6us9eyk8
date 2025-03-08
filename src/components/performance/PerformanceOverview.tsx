import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calendar,
  User,
  BookOpen,
  Network,
  Target,
  HelpCircle,
  Save,
  X
} from 'lucide-react';
import type { StudentPerformance } from '../../types';
import { supabase } from '../../lib/supabase';
import { useToastStore } from '../../stores/useToastStore';

interface PerformanceOverviewProps {
  performance: StudentPerformance;
  onCreateReview: () => void;
  onSuccess?: () => void;
  onUpdate?: () => void;
}

export function PerformanceOverview({ performance, onCreateReview, onSuccess, onUpdate }: PerformanceOverviewProps) {
  const { addToast } = useToastStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState({
    resume_quality: performance.latest_review?.resume_quality || 0,
    application_effectiveness: performance.latest_review?.application_effectiveness || 0,
    behavioral_performance: performance.latest_review?.behavioral_performance || 0,
    networking_capability: performance.latest_review?.networking_capability || 0,
    technical_proficiency: performance.latest_review?.technical_proficiency || 0,
    energy_level: performance.latest_review?.energy_level || 0
  });

  const handleSave = async () => {
    if (!performance.latest_review?.id) return;
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('performance_reviews')
        .update({
          resume_quality: editedValues.resume_quality,
          application_effectiveness: editedValues.application_effectiveness,
          behavioral_performance: editedValues.behavioral_performance,
          networking_capability: editedValues.networking_capability,
          technical_proficiency: editedValues.technical_proficiency,
          energy_level: editedValues.energy_level,
          updated_at: new Date().toISOString()
        })
        .eq('id', performance.latest_review.id);

      if (error) throw error;

      addToast('Performance indicators updated successfully', 'success');
      if (onUpdate) {
        onUpdate();
      }
      setIsEditing(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error updating performance indicators:', err);
      addToast('Failed to update performance indicators', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedValues({
      resume_quality: performance.latest_review?.resume_quality || 0,
      application_effectiveness: performance.latest_review?.application_effectiveness || 0,
      behavioral_performance: performance.latest_review?.behavioral_performance || 0,
      networking_capability: performance.latest_review?.networking_capability || 0,
      technical_proficiency: performance.latest_review?.technical_proficiency || 0,
      energy_level: performance.latest_review?.energy_level || 0
    });
    setIsEditing(false);
  };

  const getAttentionLevelColor = (level: string) => {
    switch (level) {
      case 'highest':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceRatingColor = (rating: string) => {
    switch (rating) {
      case 'outstanding':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'red_flag':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getAttentionLevelDescription = (level: string) => {
    switch (level) {
      case 'highest':
        return 'Highest: 3rd year / 4th year / Master student AND joining for more than 6 months without result AND not having a very positive prospect for this summer (eg. not in any progresses with any companies)';
      case 'high':
        return '• 3rd year / 4th year / Master student AND joining for more than 6 months without result BUT having some positive prospects for this summer\n' +
               '• OR 3rd year / 4th year / Master student joining for less than 6 months, not having a very positive prospect for this summer\n' +
               '• OR joining for more than 6 months without result but only freshman/sophomore, not having a very positive prospect for this summer\n' +
               '• OR having serious issues in terms of mental health / attitude, not having a very positive prospect for this summer\n' +
               '• OR having special requirements / notice related to / by their parents, not having a very positive prospect for this summer';
      case 'medium':
        return '• 3rd year / 4th year / Master student joining for less than 6 months BUT having some positive prospects for this summer\n' +
               '• OR joining for more than 6 months without result but only freshman/sophomore, having some positive prospects for this summer\n' +
               '• OR having serious issues in terms of mental health / attitude, but having some positive prospects for this summer\n' +
               '• OR having special requirements / notice related to / by their parents, but having some positive prospects for this summer';
      case 'low':
        return 'The rest. Note: student who has already signed an offer but is still in program => low attention level';
      default:
        return 'Not set';
    }
  };

  const getPerformanceRatingDescription = (rating: string) => {
    switch (rating) {
      case 'outstanding':
        return 'Outstanding: rating 4+ on overall rating';
      case 'medium':
        return 'Medium';
      case 'red_flag':
        return 'Redlag: rating below 2 for energy or repeated low responsiveness';
      default:
        return 'Not set';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Performance Overview</h2>
          <button
            onClick={onCreateReview}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create Review
          </button>
        </div>
      </div>

      {/* Student Info */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Student</h3>
            <div className="mt-1 flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-base font-medium text-gray-900">
                {performance.student.full_name}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Coach</h3>
            <div className="mt-1 flex items-center">
              <BookOpen className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-base font-medium text-gray-900">
                {performance.coach?.full_name || 'Not Assigned'}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Mentor</h3>
            <div className="mt-1 flex items-center">
              <Network className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-base font-medium text-gray-900">
                {performance.mentor?.full_name || 'Not Assigned'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="px-6 py-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Attention Level */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500">Attention Level</h3>
                  <div className="group relative ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-96 bg-gray-900 text-white text-xs rounded p-2 whitespace-pre-line">
                      {getAttentionLevelDescription(performance.latest_review?.attention_level || 'low')}
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getAttentionLevelColor(performance.latest_review?.attention_level || 'low')
                }`}>
                  {(performance.latest_review?.attention_level || 'low').charAt(0).toUpperCase() + 
                   (performance.latest_review?.attention_level || 'low').slice(1)}
                </span>
              </div>
              <div className="mt-2">
              </div>
            </div>

            {/* Performance Rating */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500">Performance Rating</h3>
                  <div className="group relative ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2">
                      {getPerformanceRatingDescription(performance.latest_review?.performance_rating || 'medium')}
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getPerformanceRatingColor(performance.latest_review?.performance_rating || 'medium')
                }`}>
                  {performance.latest_review?.performance_rating === 'red_flag'
                    ? 'Red Flag'
                    : (performance.latest_review?.performance_rating || 'medium').charAt(0).toUpperCase() +
                      (performance.latest_review?.performance_rating || 'medium').slice(1)}
                </span>
              </div>              
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-3 gap-4">
            {/* Resume Quality */}
            <div className={`bg-white rounded-lg border ${isEditing ? 'border-indigo-300' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Resume Quality (10%)</h3>
                <span className="text-sm text-gray-500">{isEditing ? editedValues.resume_quality : (performance.latest_review?.resume_quality || 0)}/5</span>
              </div>
              <div className="flex items-center relative">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(isEditing ? editedValues.resume_quality : (performance.latest_review?.resume_quality || 0)) / 5 * 100}%` }}
                  />
                </div>
                {isEditing && (
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={editedValues.resume_quality}
                    onChange={(e) => setEditedValues({ ...editedValues, resume_quality: parseInt(e.target.value) })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </div>
            </div>

            {/* Application Effectiveness */}
            <div className={`bg-white rounded-lg border ${isEditing ? 'border-indigo-300' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Application Effectiveness (10%)</h3>
                <span className="text-sm text-gray-500">{isEditing ? editedValues.application_effectiveness : (performance.latest_review?.application_effectiveness || 0)}/5</span>
              </div>
              <div className="flex items-center relative">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(isEditing ? editedValues.application_effectiveness : (performance.latest_review?.application_effectiveness || 0)) / 5 * 100}%` }}
                  />
                </div>
                {isEditing && (
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={editedValues.application_effectiveness}
                    onChange={(e) => setEditedValues({ ...editedValues, application_effectiveness: parseInt(e.target.value) })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </div>
            </div>

            {/* Behavioral Performance */}
            <div className={`bg-white rounded-lg border ${isEditing ? 'border-indigo-300' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Behavioral Performance (10%)</h3>
                <span className="text-sm text-gray-500">{isEditing ? editedValues.behavioral_performance : (performance.latest_review?.behavioral_performance || 0)}/5</span>
              </div>
              <div className="flex items-center relative">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(isEditing ? editedValues.behavioral_performance : (performance.latest_review?.behavioral_performance || 0)) / 5 * 100}%` }}
                  />
                </div>
                {isEditing && (
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={editedValues.behavioral_performance}
                    onChange={(e) => setEditedValues({ ...editedValues, behavioral_performance: parseInt(e.target.value) })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </div>
            </div>

            {/* Networking Capability */}
            <div className={`bg-white rounded-lg border ${isEditing ? 'border-indigo-300' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Networking Capability (20%)</h3>
                <span className="text-sm text-gray-500">{isEditing ? editedValues.networking_capability : (performance.latest_review?.networking_capability || 0)}/5</span>
              </div>
              <div className="flex items-center relative">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(isEditing ? editedValues.networking_capability : (performance.latest_review?.networking_capability || 0)) / 5 * 100}%` }}
                  />
                </div>
                {isEditing && (
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={editedValues.networking_capability}
                    onChange={(e) => setEditedValues({ ...editedValues, networking_capability: parseInt(e.target.value) })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </div>
            </div>

            {/* Technical Proficiency */}
            <div className={`bg-white rounded-lg border ${isEditing ? 'border-indigo-300' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Technical Proficiency (30%)</h3>
                <span className="text-sm text-gray-500">{isEditing ? editedValues.technical_proficiency : (performance.latest_review?.technical_proficiency || 0)}/5</span>
              </div>
              <div className="flex items-center relative">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(isEditing ? editedValues.technical_proficiency : (performance.latest_review?.technical_proficiency || 0)) / 5 * 100}%` }}
                  />
                </div>
                {isEditing && (
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={editedValues.technical_proficiency}
                    onChange={(e) => setEditedValues({ ...editedValues, technical_proficiency: parseInt(e.target.value) })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </div>
            </div>

            {/* Energy Level */}
            <div className={`bg-white rounded-lg border ${isEditing ? 'border-indigo-300' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">Energy Level (20%)</h3>
                <span className="text-sm text-gray-500">{isEditing ? editedValues.energy_level : (performance.latest_review?.energy_level || 0)}/5</span>
              </div>
              <div className="flex items-center relative">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(isEditing ? editedValues.energy_level : (performance.latest_review?.energy_level || 0)) / 5 * 100}%` }}
                  />
                </div>
                {isEditing && (
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={editedValues.energy_level}
                    onChange={(e) => setEditedValues({ ...editedValues, energy_level: parseInt(e.target.value) })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </div>
            </div>
          </div>
          
          {/* Edit Controls */}
          {performance.latest_review && (
            <div className="mt-4 flex justify-end space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Edit Indicators
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}