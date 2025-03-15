import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { CalendarIcon, ArrowUpIcon, ArrowDownIcon, BarChart2, Users, Clock, Trophy } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { supabase } from '../lib/supabase';
import { StudentDashboard } from '../components/StudentDashboard';

type DateRangeType = 'this_month' | 'last_3_months' | 'last_year' | 'custom';
type MetricType = 'attention' | 'performance' | 'energy' | 'technical' | 'behavioral' | 'networking' | 'application' | 'resume';

interface MonthlyData {
  month: string;
  [key: string]: any;
}

interface StudentActivity {
  student_id: string;
  student_name: string;
  student_email: string;
  applications_count: number;
  networking_count: number;
  last_application_date: string | null;
  last_networking_date: string | null;
  last_office_hour: string | null;
  last_mock_interview: string | null;
  last_resume_review: string | null;
}

export function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<{
    total_active_students: number;
    avg_completion_days: number;
    success_rate: number;
  } | null>(null);
  const [chartData, setChartData] = useState<MonthlyData[]>([]);
  const [activityTrends, setActivityTrends] = useState<MonthlyData[]>([]);
  const [taskMetrics, setTaskMetrics] = useState<MonthlyData[]>([]);
  const [studentActivity, setStudentActivity] = useState<StudentActivity[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeType>('last_3_months');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('attention');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof StudentActivity;
    direction: 'asc' | 'desc';
  } | null>(null);
  const isCoach = user?.role === 'coach';

  useEffect(() => {
    // Update custom date range when filter changes
    if (dateRange !== 'custom') {
      const { startDate, endDate } = getDateRange();
      setCustomStartDate(startDate.toISOString().slice(0, 7));
      setCustomEndDate(endDate.toISOString().slice(0, 7));
    }

    if (isCoach) {
      loadData();
    }
  }, [user, dateRange]);

  useEffect(() => {
    if (isCoach && (dateRange === 'custom')) {
      loadData();
    }
  }, [user, customStartDate, customEndDate]);

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

  const loadStudentActivity = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      const { data, error } = await supabase.rpc('get_student_activity', {
        p_coach_id: user?.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      if (error) throw error;
      setStudentActivity(data);
    } catch (err) {
      console.error('Error loading student activity:', err);
      setStudentActivity([]);
    }
  };

  const loadChartData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      const { data: performanceData, error: performanceError } = await supabase.rpc('get_student_performance_history', {
        p_coach_id: user?.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      if (performanceError) throw performanceError;

      // Transform data for the chart
      const formattedData = performanceData.map((item: any) => {
        const date = new Date(item.month);
        // Add one day to avoid timezone issues
        date.setDate(date.getDate() + 1);
        return {
          month: date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' }),
          ...item.attention_levels,
          outstanding: item.performance_counts?.outstanding || 0,
          medium: item.performance_counts?.medium || 0,
          red_flag: item.performance_counts?.red_flag || 0,
          energy_1: item.energy_counts?.[1] || 0,
          energy_2: item.energy_counts?.[2] || 0,
          energy_3: item.energy_counts?.[3] || 0,
          energy_4: item.energy_counts?.[4] || 0,
          energy_5: item.energy_counts?.[5] || 0,
          technical_1: item.technical_counts?.[1] || 0,
          technical_2: item.technical_counts?.[2] || 0,
          technical_3: item.technical_counts?.[3] || 0,
          technical_4: item.technical_counts?.[4] || 0,
          technical_5: item.technical_counts?.[5] || 0,
          behavioral_1: item.behavioral_counts?.[1] || 0,
          behavioral_2: item.behavioral_counts?.[2] || 0,
          behavioral_3: item.behavioral_counts?.[3] || 0,
          behavioral_4: item.behavioral_counts?.[4] || 0,
          behavioral_5: item.behavioral_counts?.[5] || 0,
          application_1: item.application_counts?.[1] || 0,
          application_2: item.application_counts?.[2] || 0,
          application_3: item.application_counts?.[3] || 0,
          application_4: item.application_counts?.[4] || 0,
          application_5: item.application_counts?.[5] || 0,
          resume_1: item.resume_counts?.[1] || 0,
          resume_2: item.resume_counts?.[2] || 0,
          resume_3: item.resume_counts?.[3] || 0,
          resume_4: item.resume_counts?.[4] || 0,
          resume_5: item.resume_counts?.[5] || 0,
          networking_1: item.networking_counts?.[1] || 0,
          networking_2: item.networking_counts?.[2] || 0,
          networking_3: item.networking_counts?.[3] || 0,
          networking_4: item.networking_counts?.[4] || 0,
          networking_5: item.networking_counts?.[5] || 0
        };
      });

      setChartData(formattedData);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setChartData([]);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load student overview
      const { data: overviewData, error: overviewError } = await supabase.rpc('get_student_overview', {
        p_coach_id: user?.id
      });

      if (overviewError) throw overviewError;
      setOverview(overviewData[0]);

      const { startDate, endDate } = getDateRange();
      
      // Load task metrics
      const { data: taskData, error: taskError } = await supabase.rpc('get_task_metrics', {
        p_coach_id: user?.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      if (taskError) throw taskError;


      // Transform task metrics data
      const formattedTaskMetrics = taskData.map((item: any) => {
        const date = new Date(item.month);
        // Add one day to avoid timezone issues
        date.setDate(date.getDate() + 1);
        return {
          month: date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' }),
          total: item.total_tasks,
        completed: item.completed_tasks,
        pending: item.pending_tasks,
        overdue: item.overdue_tasks
        };
      });
          

      setTaskMetrics(formattedTaskMetrics);

      // Load activity trends
      const { data: trendsData, error: trendsError } = await supabase.rpc('get_activity_trends', {
        p_coach_id: user?.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      if (trendsError) throw trendsError;

      // Transform trends data
      const formattedTrends = trendsData.map((item: any) => {
        const date = new Date(item.month);
        // Add one day to avoid timezone issues
        date.setDate(date.getDate() + 1);
        return {
        month: date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' }),
        total_applications: item.total_applications,
        total_networking: item.total_networking
      };
      });

      setActivityTrends(formattedTrends);

      await Promise.all([
        loadChartData(),
        loadStudentActivity()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: keyof StudentActivity) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedStudentActivity = React.useMemo(() => {
    if (!sortConfig) return studentActivity;

    return [...studentActivity].sort((a, b) => {
      if (a[sortConfig.key] === null) return 1;
      if (b[sortConfig.key] === null) return -1;
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [studentActivity, sortConfig]);

  const getChartConfig = () => {
    switch (selectedMetric) {
      case 'attention':
        return {
          areas: [
            { 
              key: 'highest', 
              name: 'Highest Priority', 
              color: '#ef4444', 
              fillColor: '#fca5a5', 
              tooltip: 'Highest: 3rd year / 4th year / Master student AND joining for more than 6 months without result AND not having a very positive prospect for this summer (eg. not in any progresses with any companies)'
            },
            { 
              key: 'high', 
              name: 'High Priority', 
              color: '#f97316', 
              fillColor: '#fdba74',
              tooltip: '• 3rd year / 4th year / Master student AND joining for more than 6 months without result BUT having some positive prospects for this summer\n• OR 3rd year / 4th year / Master student joining for less than 6 months, not having a very positive prospect for this summer\n• OR joining for more than 6 months without result but only freshman/sophomore, not having a very positive prospect for this summer\n• OR having serious issues in terms of mental health / attitude, not having a very positive prospect for this summer\n• OR having special requirements / notice related to / by their parents, not having a very positive prospect for this summer'
            },
            { 
              key: 'medium', 
              name: 'Medium Priority', 
              color: '#eab308', 
              fillColor: '#fde047',
              tooltip: '• 3rd year / 4th year / Master student joining for less than 6 months BUT having some positive prospects for this summer\n• OR joining for more than 6 months without result but only freshman/sophomore, having some positive prospects for this summer\n• OR having serious issues in terms of mental health / attitude, but having some positive prospects for this summer\n• OR having special requirements / notice related to / by their parents, but having some positive prospects for this summer'
            },
            { 
              key: 'low', 
              name: 'Low Priority', 
              color: '#22c55e', 
              fillColor: '#86efac',
              tooltip: 'The rest. Note: student who has already signed an offer but is still in program => low attention level'
            }
          ],
          title: 'Student Attention Level Distribution'
        };
      case 'performance':
        return {
          areas: [
            { 
              key: 'red_flag', 
              name: 'Red Flag', 
              color: '#ef4444', 
              fillColor: '#fca5a5',
              tooltip: 'Redlag: rating below 2 for energy or repeated low responsiveness'
            },
            { 
              key: 'medium', 
              name: 'Medium', 
              color: '#eab308', 
              fillColor: '#fde047',
              tooltip: 'Medium'
            },
            { 
              key: 'outstanding', 
              name: 'Outstanding', 
              color: '#22c55e', 
              fillColor: '#86efac',
              tooltip: 'Outstanding: rating 4+ on overall rating'
            }
          ],
          title: 'Student Performance Rating Distribution'
        };
      case 'energy':
        return {
          areas: [
            { 
              key: 'energy_1', 
              name: 'Level 1', 
              color: '#ef4444', 
              fillColor: '#fca5a5',
              tooltip: 'Extremely Burnt Out & Stressed (needs immediate support)'
            },
            { 
              key: 'energy_2', 
              name: 'Level 2', 
              color: '#f97316', 
              fillColor: '#fdba74',
              tooltip: 'Stressed, tentatively Burnt Out'
            },
            { 
              key: 'energy_3', 
              name: 'Level 3', 
              color: '#eab308', 
              fillColor: '#fde047',
              tooltip: 'Slightly Stressed/Neutral but Manageable'
            },
            { 
              key: 'energy_4', 
              name: 'Level 4', 
              color: '#22c55e', 
              fillColor: '#86efac',
              tooltip: 'Quite Positive & Motivated'
            },
            { 
              key: 'energy_5', 
              name: 'Level 5', 
              color: '#15803d', 
              fillColor: '#4ade80',
              tooltip: 'Extremely Positive & Motivated'
            }
          ],
          title: 'Student Energy Level Distribution'
        };
      case 'technical':
        return {
          areas: [
            { 
              key: 'technical_1', 
              name: 'Level 1', 
              color: '#ef4444', 
              fillColor: '#fca5a5',
              tooltip: 'Totally off track'
            },
            { 
              key: 'technical_2', 
              name: 'Level 2', 
              color: '#f97316', 
              fillColor: '#fdba74',
              tooltip: 'Slightly off track'
            },
            { 
              key: 'technical_3', 
              name: 'Level 3', 
              color: '#eab308', 
              fillColor: '#fde047',
              tooltip: 'On track'
            },
            { 
              key: 'technical_4', 
              name: 'Level 4', 
              color: '#22c55e', 
              fillColor: '#86efac',
              tooltip: 'Slightly ahead of schedule'
            },
            { 
              key: 'technical_5', 
              name: 'Level 5', 
              color: '#15803d', 
              fillColor: '#4ade80',
              tooltip: 'Outstanding performance requiring advanced support'
            }
          ],
          title: 'Technical Proficiency Distribution'
        };
      case 'behavioral':
        return {
          areas: [
            { 
              key: 'behavioral_1', 
              name: 'Level 1', 
              color: '#ef4444', 
              fillColor: '#fca5a5',
              tooltip: 'Very poor content & delivery'
            },
            { 
              key: 'behavioral_2', 
              name: 'Level 2', 
              color: '#f97316', 
              fillColor: '#fdba74',
              tooltip: 'Needs more practice for content & delivery'
            },
            { 
              key: 'behavioral_3', 
              name: 'Level 3', 
              color: '#eab308', 
              fillColor: '#fde047',
              tooltip: 'Ready to apply (equal to grade 3/5 in CPI mock)'
            },
            { 
              key: 'behavioral_4', 
              name: 'Level 4', 
              color: '#22c55e', 
              fillColor: '#86efac',
              tooltip: 'Very strong communication and storytelling'
            },
            { 
              key: 'behavioral_5', 
              name: 'Level 5', 
              color: '#15803d', 
              fillColor: '#4ade80',
              tooltip: 'Exceptional communication and storytelling'
            }
          ],
          title: 'Behavioral Performance Distribution'
        };
      case 'application':
        return {
          areas: [
            { 
              key: 'application_1', 
              name: 'Level 1', 
              color: '#ef4444', 
              fillColor: '#fca5a5',
              tooltip: 'Regular: <10 applications/month\nHighest Attention: <15 applications/month'
            },
            { 
              key: 'application_2', 
              name: 'Level 2', 
              color: '#f97316', 
              fillColor: '#fdba74',
              tooltip: 'Regular: 10-29 applications/month\nHighest Attention: 15-44 applications/month'
            },
            { 
              key: 'application_3', 
              name: 'Level 3', 
              color: '#eab308', 
              fillColor: '#fde047',
              tooltip: 'Regular: 30-49 applications/month\nHighest Attention: 45-74 applications/month'
            },
            { 
              key: 'application_4', 
              name: 'Level 4', 
              color: '#22c55e', 
              fillColor: '#86efac',
              tooltip: 'Regular: 50-69 applications/month\nHighest Attention: 75-104 applications/month'
            },
            { 
              key: 'application_5', 
              name: 'Level 5', 
              color: '#15803d', 
              fillColor: '#4ade80',
              tooltip: 'Regular: 70+ applications/month\nHighest Attention: 105+ applications/month'
            }
          ],
          title: 'Application Effectiveness Distribution'
        };
      case 'resume':
        return {
          areas: [
            { 
              key: 'resume_1', 
              name: 'Level 1', 
              color: '#ef4444', 
              fillColor: '#fca5a5',
              tooltip: 'Below Level 2 or no resume'
            },
            { 
              key: 'resume_2', 
              name: 'Level 2', 
              color: '#f97316', 
              fillColor: '#fdba74',
              tooltip: '80% review checklist, 1 work experience, 1 teamwork/leadership'
            },
            { 
              key: 'resume_3', 
              name: 'Level 3', 
              color: '#eab308', 
              fillColor: '#fde047',
              tooltip: '100% review checklist, 2+ work experience, 1 teamwork/leadership'
            },
            { 
              key: 'resume_4', 
              name: 'Level 4', 
              color: '#22c55e', 
              fillColor: '#86efac',
              tooltip: '100% review checklist, 2+ work experience, 1+ teamwork/leadership, 1 award'
            },
            { 
              key: 'resume_5', 
              name: 'Level 5', 
              color: '#15803d', 
              fillColor: '#4ade80',
              tooltip: '100% review checklist, 2+ work experience, 1+ teamwork/leadership, 1+ award'
            }
          ],
          title: 'Resume Quality Distribution'
        };
      case 'networking':
        return {
          areas: [
            { 
              key: 'networking_1', 
              name: 'Level 1', 
              color: '#ef4444', 
              fillColor: '#fca5a5',
              tooltip: 'Regular: <2 info interviews/month\nHighest Attention: <4 info interviews/month'
            },
            { 
              key: 'networking_2', 
              name: 'Level 2', 
              color: '#f97316', 
              fillColor: '#fdba74',
              tooltip: 'Regular: 2-3 info interviews/month\nHighest Attention: 4-6 info interviews/month'
            },
            { 
              key: 'networking_3', 
              name: 'Level 3', 
              color: '#eab308', 
              fillColor: '#fde047',
              tooltip: 'Regular: 4-6 info interviews/month\nHighest Attention: 7-11 info interviews/month'
            },
            { 
              key: 'networking_4', 
              name: 'Level 4', 
              color: '#22c55e', 
              fillColor: '#86efac',
              tooltip: 'Regular: 7-10 info interviews/month\nHighest Attention: 12-19 info interviews/month'
            },
            { 
              key: 'networking_5', 
              name: 'Level 5', 
              color: '#15803d', 
              fillColor: '#4ade80',
              tooltip: 'Regular: 10+ info interviews/month\nHighest Attention: 20+ info interviews/month'
            }
          ],
          title: 'Networking Capability Distribution'
        };
      default:
        return {
          areas: [],
          title: 'Student Distribution'
        };
    }
  };

  const chartConfig = getChartConfig();

  return (
    <div className="min-h-screen bg-gray-50 -mt-8 -mx-8 -mb-8">
      <div className="max-w-7xl mx-auto p-8">
        {user?.role === 'student' ? (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">My Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Track your job search progress and goals
            </p>
            <StudentDashboard />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">Coach Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Monitor your students' performance and progress
            </p>

            <div className="mt-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Active Students
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {overview?.total_active_students || 0}
                            </div>
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
                        <Clock className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Avg. Program Completion
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {overview?.avg_completion_days ? `${Math.round(overview.avg_completion_days)} days` : 'N/A'}
                            </div>
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
                        <Trophy className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Success Rate
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {overview?.success_rate ? `${overview.success_rate}%` : '0%'}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {isCoach && isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : isCoach && (
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">{chartConfig.title}</h2>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="attention">Attention Levels</option>
                    <option value="performance">Performance Ratings</option>
                    <option value="energy">Energy Levels</option>
                    <option value="technical">Technical Proficiency</option>
                    <option value="behavioral">Behavioral Performance</option>
                    <option value="application">Application Effectiveness</option>
                    <option value="resume">Resume Quality</option>
                    <option value="networking">Networking Capability</option>
                  </select>
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
                    </div>
                  )}
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend content={({ payload }) => (
                      <div className="flex flex-wrap gap-4 justify-center w-full">
                        {payload?.map((entry) => (
                          <div key={entry.value} className="relative group">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3" style={{ backgroundColor: entry.color }} />
                              <span>{entry.value}</span>
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-sm rounded shadow-lg z-50">
                              {chartConfig.areas.find(a => a.name === entry.value)?.tooltip}
                            </div>
                          </div>
                        ))}
                      </div>
                    )} />
                    {chartConfig.areas.map((area) => (
                      <Area
                        key={area.key}
                        legendType="circle"
                        type="monotone"
                        dataKey={area.key}
                        name={area.name}
                        stackId="1"
                        stroke={area.color}
                        fill={area.fillColor}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg mt-8">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Activity Trends</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={activityTrends}
                      margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total_applications"
                        name="Total Applications"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_networking"
                        name="Total Networking"
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg mt-8">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Task Metrics</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={taskMetrics}
                      margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} />
                      <Bar
                        dataKey="completed"
                        name="Completed"
                        fill="#22c55e"
                        stackId="a"
                      />
                      <Bar
                        dataKey="pending"
                        name="Pending"
                        fill="#eab308"
                        stackId="a"
                      />
                      <Bar
                        dataKey="overdue"
                        name="Overdue"
                        fill="#ef4444"
                        stackId="a"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg mt-8">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Student Activity Summary</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th 
                          className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('student_name')}
                        >
                          Student Name
                          {sortConfig?.key === 'student_name' && (
                            sortConfig.direction === 'asc' ? <ArrowUpIcon className="inline w-4 h-4 ml-1" /> : <ArrowDownIcon className="inline w-4 h-4 ml-1" />
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('applications_count')}
                        >
                          Applications
                          {sortConfig?.key === 'applications_count' && (
                            sortConfig.direction === 'asc' ? <ArrowUpIcon className="inline w-4 h-4 ml-1" /> : <ArrowDownIcon className="inline w-4 h-4 ml-1" />
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('networking_count')}
                        >
                          Networking
                          {sortConfig?.key === 'networking_count' && (
                            sortConfig.direction === 'asc' ? <ArrowUpIcon className="inline w-4 h-4 ml-1" /> : <ArrowDownIcon className="inline w-4 h-4 ml-1" />
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('last_application_date')}
                        >
                          Last Application
                          {sortConfig?.key === 'last_application_date' && (
                            sortConfig.direction === 'asc' ? <ArrowUpIcon className="inline w-4 h-4 ml-1" /> : <ArrowDownIcon className="inline w-4 h-4 ml-1" />
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('last_networking_date')}
                        >
                          Last Networking
                          {sortConfig?.key === 'last_networking_date' && (
                            sortConfig.direction === 'asc' ? <ArrowUpIcon className="inline w-4 h-4 ml-1" /> : <ArrowDownIcon className="inline w-4 h-4 ml-1" />
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('last_office_hour')}
                        >
                          Last Office Hour
                          {sortConfig?.key === 'last_office_hour' && (
                            sortConfig.direction === 'asc' ? <ArrowUpIcon className="inline w-4 h-4 ml-1" /> : <ArrowDownIcon className="inline w-4 h-4 ml-1" />
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('last_mock_interview')}
                        >
                          Last Mock Interview
                          {sortConfig?.key === 'last_mock_interview' && (
                            sortConfig.direction === 'asc' ? <ArrowUpIcon className="inline w-4 h-4 ml-1" /> : <ArrowDownIcon className="inline w-4 h-4 ml-1" />
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('last_resume_review')}
                        >
                          Last Resume Review
                          {sortConfig?.key === 'last_resume_review' && (
                            sortConfig.direction === 'asc' ? <ArrowUpIcon className="inline w-4 h-4 ml-1" /> : <ArrowDownIcon className="inline w-4 h-4 ml-1" />
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedStudentActivity.map((student) => (
                        <tr key={student.student_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.student_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.applications_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.networking_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.last_application_date ? new Date(student.last_application_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.last_networking_date ? new Date(student.last_networking_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.last_office_hour ? new Date(student.last_office_hour).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.last_mock_interview ? new Date(student.last_mock_interview).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.last_resume_review ? new Date(student.last_resume_review).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}