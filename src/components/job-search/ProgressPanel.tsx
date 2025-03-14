import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/useToastStore';
import { BarChart, TrendingUp, Users, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ApplicationMetrics {
  total_applications: number;
  applications_by_status: Record<string, number>;
  response_rate: number;
  interview_rate: number;
  offer_rate: number;
}

interface WeeklyProgress {
  goals: {
    applications: number;
    connections: number;
  };
  actual: {
    applications: number;
    connections: number;
  };
}

interface ProgressPanelProps {
  studentId?: string;
}

export function ProgressPanel({ studentId }: ProgressPanelProps) {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const [metrics, setMetrics] = useState<ApplicationMetrics | null>(null);
  const [progress, setProgress] = useState<WeeklyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: (() => {
      const date = new Date();
      // Go back 4 weeks and start from Monday
      date.setDate(date.getDate() - 28);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      date.setDate(diff);
      return date.toISOString().split('T')[0];
    })(),
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user?.id) {
      loadProgressData(true);
    }
  }, [studentId, dateRange]);

  async function loadProgressData(generateReviews = false) {
    try {
      setIsLoading(true);
      if (!studentId) return;

      // Calculate metrics directly
      const { data: applications } = await supabase
        .from('job_applications') 
        .select('status') 
        .eq('student_id', studentId)
        .gte('application_date', dateRange.start)
        .lte('application_date', dateRange.end);

      // Calculate metrics
      const total = applications?.length || 0;
      const statusCounts = applications?.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const responses = applications?.filter(app => 
        !['draft', 'applied'].includes(app.status)
      ).length || 0;

      const interviews = applications?.filter(app => 
        app.status === 'interview'
      ).length || 0;

      const offers = applications?.filter(app => 
        app.status === 'offer'
      ).length || 0;

      setMetrics({
        total_applications: total,
        applications_by_status: statusCounts,
        response_rate: total ? Number(((responses * 100.0) / total).toFixed(2)) : 0,
        interview_rate: total ? Number(((interviews * 100.0) / total).toFixed(2)) : 0,
        offer_rate: total ? Number(((offers * 100.0) / total).toFixed(2)) : 0
      });

      // Get user's goals
      const { data: goals } = await supabase
        .from('career_goals')
        .select('weekly_application_goal, weekly_connection_goal')
        .eq('student_id', studentId)
        .single();

      // Get applications count
      const { count: applicationsCount } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .gte('application_date', dateRange.start)
        .lte('application_date', dateRange.end);

      // Get networking connections count
      const { count: connectionsCount } = await supabase
        .from('networking_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .gte('interaction_date', dateRange.start)
        .lte('interaction_date', dateRange.end);

      // Calculate days in range for prorated goals
      const days = Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24));
      const weeks = Math.max(1, Math.ceil(days / 7));

      setProgress({
        goals: {
          applications: (goals?.weekly_application_goal || 5) * weeks,
          connections: (goals?.weekly_connection_goal || 5) * weeks
        },
        actual: {
          applications: applicationsCount || 0,
          connections: connectionsCount || 0
        }
      });

    } catch (error) {
      console.error('Error loading progress:', error);
      addToast('Failed to load progress data', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  const getProgressColor = (actual: number, goal: number) => {
    const percentage = (actual / goal) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
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
      {/* Date Range Selector */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Applications
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics?.total_applications || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Response Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics?.response_rate.toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Interview Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics?.interview_rate.toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Offer Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics?.offer_rate.toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Status Breakdown */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Application Status Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {metrics?.applications_by_status && Object.entries(metrics.applications_by_status).map(([status, count]) => (
            <div key={status} className="bg-gray-50 rounded-lg p-4">
              <dt className="text-sm font-medium text-gray-500 capitalize">
                {status.replace('_', ' ')}
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {count}
              </dd>
              <dd className="mt-1 text-sm text-gray-500">
                {((count / metrics.total_applications) * 100).toFixed(1)}%
              </dd>
            </div>
          ))}
        </div>
      </div>

      {/* Applications and Networking Progress */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Applications Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BarChart className="h-5 w-5 text-indigo-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Applications Progress</h3>
            </div>
            <div className="text-sm text-gray-500">
              Goal: {progress?.goals.applications} applications
            </div>
          </div>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                  Progress
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-indigo-600">
                  {progress?.actual.applications} / {progress?.goals.applications}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
              <div
                style={{ width: `${Math.min((progress?.actual.applications || 0) / (progress?.goals.applications || 1) * 100, 100)}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                  getProgressColor(progress?.actual.applications || 0, progress?.goals.applications || 1)
                }`}
              />
            </div>
          </div>
        </div>

        {/* Networking Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-indigo-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Networking Progress</h3>
            </div>
            <div className="text-sm text-gray-500">
              Goal: {progress?.goals.connections} connections
            </div>
          </div>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                  Progress
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-indigo-600">
                  {progress?.actual.connections} / {progress?.goals.connections}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
              <div
                style={{ width: `${Math.min((progress?.actual.connections || 0) / (progress?.goals.connections || 1) * 100, 100)}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                  getProgressColor(progress?.actual.connections || 0, progress?.goals.connections || 1)
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}