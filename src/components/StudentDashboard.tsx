import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { BarChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar } from 'recharts';
import { supabase } from '../lib/supabase';
import { CalendarIcon, Send, Users2, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface CareerGoals {
  weekly_application_goal: number;
  weekly_connection_goal: number;
}

type DateRangeType = 'this_month' | 'last_3_months' | 'last_year' | 'custom';

interface ActivityData {
  month: string;
  applications: number;
  networking: number;
  application_goal: number;
  networking_goal: number;
}

interface TaskMetrics {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export function StudentDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [careerGoals, setCareerGoals] = useState<CareerGoals | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics>({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  });
  const [dateRange, setDateRange] = useState<DateRangeType>('last_3_months');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  useEffect(() => {
    // Update custom date range when filter changes
    if (dateRange !== 'custom') {
      const { startDate, endDate } = getDateRange();
      setCustomStartDate(startDate.toISOString().slice(0, 7));
      setCustomEndDate(endDate.toISOString().slice(0, 7));
    }
    loadData();
  }, [dateRange]);

  useEffect(() => {
    if (dateRange === 'custom') {
      loadData();
    }
  }, [customStartDate, customEndDate]);

  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const now = new Date();
    let result = { startDate: new Date(), endDate: new Date() };

    switch (dateRange) {
      case 'this_month':
        result = {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
        break;
      case 'last_3_months':
        result = {
          startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
        break;
      case 'last_year':
        result = {
          startDate: new Date(now.getFullYear() - 1, now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
        break;
      case 'custom':
        result = {
          startDate: new Date(customStartDate),
          endDate: customEndDate 
            ? new Date(new Date(customEndDate).getFullYear(), new Date(customEndDate).getMonth() + 1, 0)
            : new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
        break;
      default:
        result = {
          startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
    }

    return result;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { startDate, endDate } = getDateRange();

      // Load task metrics
      const { data: taskGroups } = await supabase
        .from('task_groups')
        .select('id')
        .eq('owner_id', user?.id);

      if (taskGroups && taskGroups.length > 0) {
        const groupIds = taskGroups.map(g => g.id);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status, due_date')
          .in('group_id', groupIds);

        if (tasks) {
          const now = new Date();
          setTaskMetrics({
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            pending: tasks.filter(t => t.status !== 'completed').length,
            overdue: tasks.filter(t => 
              t.status !== 'completed' && 
              t.due_date && 
              new Date(t.due_date) < now
            ).length
          });
        }
      }

      // Load career goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('career_goals')
        .select('weekly_application_goal, weekly_connection_goal')
        .eq('student_id', user?.id)
        .single();

      if (goalsError) throw goalsError;
      setCareerGoals(goalsData);

      // Load applications and networking data
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('job_applications')
        .select('application_date')
        .eq('student_id', user?.id)
        .gte('application_date', startDate.toISOString())
        .lte('application_date', endDate.toISOString());

      const { data: networkingData, error: networkingError } = await supabase
        .from('networking_interactions')
        .select('interaction_date')
        .eq('student_id', user?.id)
        .gte('interaction_date', startDate.toISOString())
        .lte('interaction_date', endDate.toISOString());

      if (applicationsError || networkingError) throw applicationsError || networkingError;

      // Process data by month
      const monthlyData: { [key: string]: ActivityData } = {};
      const months = [];
      for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
        const monthKey = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        months.push(monthKey);
        monthlyData[monthKey] = {
          month: monthKey,
          applications: 0,
          networking: 0,
          application_goal: goalsData?.weekly_application_goal * 4 || 0, // Monthly goal
          networking_goal: goalsData?.weekly_connection_goal * 4 || 0 // Monthly goal
        };
      }

      // Count applications by month
      applicationsData?.forEach(app => {
        const monthKey = new Date(app.application_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].applications++;
        }
      });

      // Count networking interactions by month
      networkingData?.forEach(interaction => {
        const monthKey = new Date(interaction.interaction_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].networking++;
        }
      });

      setActivityData(months.map(month => monthlyData[month]));
    } catch (error) {
      console.error('Error loading student dashboard data:', error);
    } finally {
      setIsLoading(false);
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
    <div className="space-y-8 mt-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Application Progress Panel */}
        <div className="col-span-1 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Application Progress</h3>
            <Send className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {activityData[activityData.length - 1]?.applications || 0}
              </p>
              <p className="text-sm text-gray-500">applications this month</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                Goal: {careerGoals?.weekly_application_goal ? careerGoals.weekly_application_goal * 4 : 0}
              </p>
              <p className="text-sm text-gray-500">per month</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-indigo-600 rounded-full" 
                style={{ 
                  width: `${Math.min(100, ((activityData[activityData.length - 1]?.applications || 0) / ((careerGoals?.weekly_application_goal || 0) * 4)) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Networking Progress Panel */}
        <div className="col-span-1 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Networking Progress</h3>
            <Users2 className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {activityData[activityData.length - 1]?.networking || 0}
              </p>
              <p className="text-sm text-gray-500">connections this month</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                Goal: {careerGoals?.weekly_connection_goal ? careerGoals.weekly_connection_goal * 4 : 0}
              </p>
              <p className="text-sm text-gray-500">per month</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-green-600 rounded-full" 
                style={{ 
                  width: `${Math.min(100, ((activityData[activityData.length - 1]?.networking || 0) / ((careerGoals?.weekly_connection_goal || 0) * 4)) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Monthly Progress Panel */}
        <div className="col-span-1 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Task Overview</h3>
            <CheckCircle2 className="h-6 w-6 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-lg font-semibold text-gray-900">{taskMetrics.completed}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-lg font-semibold text-gray-900">{taskMetrics.pending}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Overdue</p>
                <p className="text-lg font-semibold text-gray-900">{taskMetrics.overdue}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-lg font-semibold text-gray-900">
                  {taskMetrics.pending - taskMetrics.overdue}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Activity Progress</h2>
          <div className="flex items-center gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeType)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="this_month">This Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="month"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      // Ensure end date is not before start date
                      if (e.target.value > customEndDate) {
                        setCustomEndDate(e.target.value);
                      }
                    }}
                    className="pl-8 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <span className="text-gray-500">to</span>
                <div className="relative">
                  <input
                    type="month"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    className="pl-8 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={activityData}
              margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="applications"
                name="Applications"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="application_goal"
                name="Application Goal"
                stroke="#2563eb"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="networking"
                name="Networking"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="networking_goal"
                name="Networking Goal"
                stroke="#16a34a"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}