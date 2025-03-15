import React, { useState, useEffect } from 'react';
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
import type { StudentPerformance, PerformanceReview } from '../../types';
import { supabase, createPerformanceReview } from '../../lib/supabase';
import { useToastStore } from '../../stores/useToastStore';

interface PerformanceOverviewProps {
  performance: StudentPerformance;
  onCreateReview?: () => void;
  selectedMonth: string;
  onSuccess?: () => void;
  onUpdate?: () => void;
}

async function calculateInitialValues(performance: StudentPerformance, selectedMonth: string) {
  try {
    // Get previous month's date
    const currentDate = new Date(selectedMonth + "-1");
    const prevMonth = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
    
    // Get previous month's review
    const { data: prevReviews } = await supabase
      .from('performance_reviews')
      .select('*')
      .eq('student_id', performance.student.id)
      .gte('review_date', prevMonth.toISOString().split('T')[0])
      .lte('review_date', new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).toISOString().split('T')[0])
      .order('review_date', { ascending: false })
      .limit(1);

    const prevReview = prevReviews?.[0];

    // Get current month's data
    const startDate = new Date(selectedMonth + "-1");
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    // Get behavioral mock interviews
    const { data: behavioralInterviews } = await supabase
      .from('mock_interviews')
      .select('*')
      .eq('student_id', performance.student.id)
      .eq('interview_type', 'behavioral')
      .gte('interview_date', startDate.toISOString())
      .lte('interview_date', endDate.toISOString())
      .order('interview_date', { ascending: false });

    // Get networking interactions
    const { data: networkingInteractions } = await supabase
      .from('networking_interactions')
      .select('*')
      .eq('student_id', performance.student.id)
      .gte('interaction_date', startDate.toISOString().split('T')[0])
      .lte('interaction_date', endDate.toISOString().split('T')[0]);

    // Get job applications
    const { data: jobApplications } = await supabase
      .from('job_applications')
      .select('*')
      .eq('student_id', performance.student.id)
      .gte('application_date', startDate.toISOString().split('T')[0])
      .lte('application_date', endDate.toISOString().split('T')[0]);

    // Calculate Resume Quality
    let resumeQuality = 1; // Default if no data
    if (prevReview?.resume_quality) {
      resumeQuality = prevReview.resume_quality;
    }

    // Calculate Energy Level
    let energyLevel = prevReview?.energy_level || 3; // Default to middle if no previous data

    // Calculate Behavioral Mock Interview Score
    let behavioralScore = 1; // Default if no data
    if (behavioralInterviews && behavioralInterviews.length > 0) {
      behavioralScore = behavioralInterviews[0].overall_rating / 2; // Convert from 10-point to 5-point scale
    } else if (prevReview?.behavioral_performance) {
      behavioralScore = prevReview.behavioral_performance;
    }

    // Calculate Networking Score
    const networkingCount = networkingInteractions?.length || 0;
    let networkingScore = 1;
    const isHighestAttention = performance.student.attention_level === 'highest';

    if (isHighestAttention) {
      if (networkingCount >= 20) networkingScore = 5;
      else if (networkingCount >= 12) networkingScore = 4;
      else if (networkingCount >= 7) networkingScore = 3;
      else if (networkingCount >= 4) networkingScore = 2;
      else networkingScore = 1;
    } else {
      if (networkingCount >= 10) networkingScore = 5;
      else if (networkingCount >= 7) networkingScore = 4;
      else if (networkingCount >= 4) networkingScore = 3;
      else if (networkingCount >= 2) networkingScore = 2;
      else networkingScore = 1;
    }

    // Calculate Job Application Score
    const applicationCount = jobApplications?.length || 0;
    let applicationScore = 1;

    if (isHighestAttention) {
      if (applicationCount >= 105) applicationScore = 5;
      else if (applicationCount >= 75) applicationScore = 4;
      else if (applicationCount >= 45) applicationScore = 3;
      else if (applicationCount >= 15) applicationScore = 2;
      else applicationScore = 1;
    } else {
      if (applicationCount >= 70) applicationScore = 5;
      else if (applicationCount >= 50) applicationScore = 4;
      else if (applicationCount >= 30) applicationScore = 3;
      else if (applicationCount >= 10) applicationScore = 2;
      else applicationScore = 1;
    }

    // Calculate Technical Skills
    let technicalScore = prevReview?.technical_proficiency || 3; // Default to middle if no previous data

    return {
      resume_quality: resumeQuality,
      application_effectiveness: applicationScore,
      behavioral_performance: behavioralScore,
      networking_capability: networkingScore,
      technical_proficiency: technicalScore,
      energy_level: energyLevel
    };
  } catch (error) {
    console.error('Error calculating initial values:', error);
    throw error;
  }
}

export function PerformanceOverview({ performance, onCreateReview, selectedMonth, onSuccess, onUpdate }: PerformanceOverviewProps) {
  const { addToast } = useToastStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editedValues, setEditedValues] = useState({
    attention_level: performance.latest_review?.attention_level as string || 'low',
    performance_rating: performance.latest_review?.performance_rating as string || 'medium',
    overall_notes: performance.latest_review?.overall_notes || '',
    overall_notes: performance.latest_review?.overall_notes || '',
    resume_quality: performance.latest_review?.resume_quality || 0,
    application_effectiveness: performance.latest_review?.application_effectiveness || 0,
    behavioral_performance: performance.latest_review?.behavioral_performance || 0,
    networking_capability: performance.latest_review?.networking_capability || 0,
    technical_proficiency: performance.latest_review?.technical_proficiency || 0,
    energy_level: performance.latest_review?.energy_level || 0
  });

  const handleSave = async () => {
    if (!performance.latest_review?.id && !isCreating) return;
    
    try {
      setIsSaving(true);
      
      if (isCreating) {
        // Create new review
        const review = {
          student_id: performance.student.id,
          coach_id: performance.coach?.id || '',
          review_date: new Date().toISOString().split('T')[0],
          attention_level: editedValues.attention_level,
          performance_rating: editedValues.performance_rating,
          overall_notes: '',
          ...editedValues,
          indicator_notes: {}
        };

        await createPerformanceReview(review);
        addToast('Performance review created successfully', 'success');
      } else {
        // Update existing review
        const { error } = await supabase
          .from('performance_reviews')
          .update({
            attention_level: editedValues.attention_level,
            performance_rating: editedValues.performance_rating,
            overall_notes: editedValues.overall_notes,
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
      }

      if (onUpdate) {
        onUpdate();
      }
      setIsEditing(false);
      setIsCreating(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error updating performance indicators:', err);
      addToast('Failed to update performance indicators', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // Reset edited values when performance data changes
    if (performance.latest_review) {
      setEditedValues({
        attention_level: performance.latest_review.attention_level as string || 'low',
        performance_rating: performance.latest_review.performance_rating as string || 'medium',
        overall_notes: performance.latest_review.overall_notes || '',
        resume_quality: performance.latest_review.resume_quality || 0,
        application_effectiveness: performance.latest_review.application_effectiveness || 0,
        behavioral_performance: performance.latest_review.behavioral_performance || 0,
        networking_capability: performance.latest_review.networking_capability || 0,
        technical_proficiency: performance.latest_review.technical_proficiency || 0,
        energy_level: performance.latest_review.energy_level || 0
      });
    }
  }, [performance.latest_review]);

  const handleCancel = () => {
    setEditedValues({
      attention_level: performance.latest_review?.attention_level as string || 'low',
      performance_rating: performance.latest_review?.performance_rating as string || 'medium',
      overall_notes: performance.latest_review?.overall_notes || '',
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
    <div className="bg-white shadow rounded-lg mt-8">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Performance Overview</h2>
          {!performance.latest_review && (
            <button
              onClick={async () => {
                try {
                  const initialValues = await calculateInitialValues(performance, selectedMonth);
                  setEditedValues(initialValues);
                } catch (error) {
                  console.error('Error setting initial values:', error);
                  addToast('Failed to calculate initial values', 'error');
                }
                setIsCreating(true);
                setIsEditing(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Review
            </button>
          )}
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
                  <h3 className="text-sm font-medium text-gray-500">
                    Attention Level
                  </h3>
                  <div className="group relative ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-96 bg-gray-900 text-white text-xs rounded p-2 whitespace-pre-line">
                      {getAttentionLevelDescription(isEditing ? editedValues.attention_level : (performance.latest_review?.attention_level || 'low'))}
                    </div>
                  </div>
                </div>
                {isEditing ? (
                  <select
                    value={editedValues.attention_level}
                    onChange={(e) => setEditedValues({ ...editedValues, attention_level: e.target.value })}
                    className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="highest">Highest</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getAttentionLevelColor(performance.latest_review?.attention_level || 'low')
                  }`}>
                    {(performance.latest_review?.attention_level || 'low').charAt(0).toUpperCase() + 
                     (performance.latest_review?.attention_level || 'low').slice(1)}
                  </span>
                )}
              </div>
              <div className="mt-2">
              </div>
            </div>

            {/* Performance Rating */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500">
                    Performance Rating
                  </h3>
                  <div className="group relative ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2">
                      {getPerformanceRatingDescription(isEditing ? editedValues.performance_rating : (performance.latest_review?.performance_rating || 'medium'))}
                    </div>
                  </div>
                </div>
                {isEditing ? (
                  <select
                    value={editedValues.performance_rating}
                    onChange={(e) => setEditedValues({ ...editedValues, performance_rating: e.target.value })}
                    className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="outstanding">Outstanding</option>
                    <option value="medium">Medium</option>
                    <option value="red_flag">Red Flag</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getPerformanceRatingColor(performance.latest_review?.performance_rating || 'medium')
                  }`}>
                    {performance.latest_review?.performance_rating === 'red_flag'
                      ? 'Red Flag'
                      : (performance.latest_review?.performance_rating || 'medium').charAt(0).toUpperCase() +
                        (performance.latest_review?.performance_rating || 'medium').slice(1)}
                  </span>
                )}
              </div>              
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-3 gap-4">
            {/* Resume Quality */}
            <div className={`bg-white rounded-lg border ${isEditing ? 'border-indigo-300' : 'border-gray-200'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500">Resume Quality (10%)</h3>
                  <div className="group relative ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2">
                      <p className="font-medium mb-2">Resume Rating Scale</p>
                      <p className="text-gray-300 text-xs italic mb-2">Use previous month if no current review</p>
                      <p  >5: 100% review checklist, 2+ work experience, 1+ teamwork/leadership, 1+ award</p>
                      <p  >4: 100% review checklist, 2+ work experience, 1+ teamwork/leadership, 1 award</p>
                      <p  >3: 100% review checklist, 2+ work experience, 1 teamwork/leadership</p>
                      <p  >2: 80% review checklist, 1 work experience, 1 teamwork/leadership</p>
                      <p  >1: Below Level 2 or no resume</p>
                      
                    </div>
                  </div>
                </div>
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
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500">Application Effectiveness (10%)</h3>
                  <div className="group relative ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2">
                      <p className="font-medium mb-1">Application Rating Scale:</p>
                      <p className="mb-2 text-gray-300 italic">Default = 3 if not in application season or &lt;6 months at CPI (non-3rd/4th year)</p>
                      <p className="mt-1">Regular Goals:</p>
                      <p className="text-gray-300 text-xs ml-2">5: 70+ applications/month</p>
                      <p className="text-gray-300 text-xs ml-2">4: 50-69 applications/month</p>
                      <p className="text-gray-300 text-xs ml-2">3: 30-49 applications/month</p>
                      <p className="text-gray-300 text-xs ml-2">2: 10-29 applications/month</p>
                      <p className="text-gray-300 text-xs ml-2">1: &lt;10 applications/month</p>
                      <p className="mt-1">Highest Attention Goals:</p>
                      <p className="text-gray-300 text-xs ml-2">5: 105+ applications/month</p>
                      <p className="text-gray-300 text-xs ml-2">4: 75-104 applications/month</p>
                      <p className="text-gray-300 text-xs ml-2">3: 45-74 applications/month</p>
                      <p className="text-gray-300 text-xs ml-2">2: 15-44 applications/month</p>
                      <p className="text-gray-300 text-xs ml-2">1: &lt;15 applications/month</p>
                    </div>
                  </div>
                </div>
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
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500">Behavioral Performance (10%)</h3>
                  <div className="group relative ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2">
                      <p className="font-medium mb-1">Behavioral Rating Scale:</p>
                      <p className="mb-2 text-gray-300 italic">Based on mock interview scores. Use previous month's score if no current review.</p>
                      <p>5: Exceptional communication and storytelling</p>
                      <p>4: Very strong communication and storytelling</p>
                      <p>3: Ready to apply (equal to grade 3/5 in CPI mock)</p>
                      <p>2: Needs more practice for content & delivery</p>
                      <p>1: Very poor content & delivery</p>
                    </div>
                  </div>
                </div>
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
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500">Networking Capability (20%)</h3>
                  <div className="group relative ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2">
                      <p className="font-medium mb-1">Networking Rating Scale:</p>
                      <p className="mb-2 text-gray-300 italic">Default = 3 if in foundation training. Higher goals for highest attention cases.</p>
                      <p className="mt-1">Regular Goals:</p>
                      <p className="text-gray-300 text-xs ml-2">5: 10+ info interviews/month</p>
                      <p className="text-gray-300 text-xs ml-2">4: 7-10 info interviews/month</p>
                      <p className="text-gray-300 text-xs ml-2">3: 4-6 info interviews/month</p>
                      <p className="text-gray-300 text-xs ml-2">2: 2-3 info interviews/month</p>
                      <p className="text-gray-300 text-xs ml-2">1: &lt;2 info interviews/month</p>
                      <p className="mt-1">Highest Attention Goals:</p>
                      <p className="text-gray-300 text-xs ml-2">5: 20+ info interviews/month</p>
                      <p className="text-gray-300 text-xs ml-2">4: 12-19 info interviews/month</p>
                      <p className="text-gray-300 text-xs ml-2">3: 7-11 info interviews/month</p>
                      <p className="text-gray-300 text-xs ml-2">2: 4-6 info interviews/month</p>
                      <p className="text-gray-300 text-xs ml-2">1: &lt;4 info interviews/month</p>
                    </div>
                  </div>
                </div>
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
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500">Technical Proficiency (30%)</h3>
                  <div className="group relative ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2">
                      <p className="font-medium mb-1">Technical Skills Rating Scale:</p>
                      <p className="mb-2 text-gray-300 italic">Evaluate based on:</p>
                      <p className="text-gray-300 text-xs">Data:</p>
                      <p className="text-gray-300 text-xs ml-2">• Mentor's evaluation after technical interview</p>
                      <p className="text-gray-300 text-xs ml-2">• If student studies with KPIM: Check KPIM dashboard</p>
                      <p className="text-gray-300 text-xs">CS:</p>
                      <p className="text-gray-300 text-xs ml-2">• Mentor's evaluation after technical interview</p>
                      <p className="text-gray-300 text-xs ml-2">• CS interview evaluation form</p>
                      <p className="text-gray-300 text-xs ml-2">• CS sample questions</p>
                      <p className="text-gray-300 text-xs ml-2">• If student studies with FSE: Check FSE monthly notes</p>
                      <p className="mt-2">5: Outstanding performance requiring advanced support</p>
                      <p>4: Slightly ahead of schedule</p>
                      <p>3: On track</p>
                      <p>2: Slightly off track</p>
                      <p>1: Totally off track</p>
                    </div>
                  </div>
                </div>
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
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-500">Energy Level (20%)</h3>
                  <div className="group relative ml-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2">
                      <p className="font-medium mb-1">Energy Rating Scale:</p>
                      <p className="mb-2 text-gray-300 italic">Based on attendance, surveys, and check-in messages/office hours</p>
                      <p>5: Extremely Positive & Motivated</p>
                      <p>4: Quite Positive & Motivated</p>
                      <p>3: Slightly Stressed/Neutral but Manageable</p>
                      <p>2: Stressed, tentatively Burnt Out</p>
                      <p>1: Extremely Burnt Out & Stressed (needs immediate support)</p>
                    </div>
                  </div>
                </div>
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
        </div>
      </div>


      {/* Overall Notes Section */}
      {(performance.latest_review?.overall_notes || isEditing) && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Overall Notes</h3>
          </div>
          {isEditing ? (
            <textarea
              value={editedValues.overall_notes || ''}
              onChange={(e) => setEditedValues({ ...editedValues, overall_notes: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={4}
              placeholder="Add any overall notes, observations, or recommendations..."
            />
          ) : (
            <div className="prose prose-sm max-w-none text-gray-600">
              {performance.latest_review?.overall_notes}
            </div>
          )}
        </div>
      )}
      
      {/* Edit Button */}
      {performance.latest_review && !isEditing && !isCreating && (
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Edit Indicators
          </button>
        </div>
      )}
      
      {/* Save/Cancel Buttons */}
      {(isEditing || isCreating) && (
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2">
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
        </div>
      )}
      
    </div>
  );
}