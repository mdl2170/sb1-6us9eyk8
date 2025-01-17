import React from 'react';
import { Briefcase, Users, GraduationCap, Trophy, AlertCircle, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  completionRate: number;
  atRiskStudents: number;
  pendingInterventions: number;
  averageEngagement: number;
}

interface CohortMetrics {
  cohort: string;
  totalStudents: number;
  avgCompletionRate: number;
  avgEngagementScore: number;
  highRiskStudents: number;
  riskPercentage: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cohortMetrics, setCohortMetrics] = useState<CohortMetrics[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'coach') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch overview stats
      const { data: overviewData } = await supabase
        .from('student_performance_overview')
        .select('*');

      // Fetch cohort analytics
      const { data: cohortData } = await supabase
        .from('cohort_analytics')
        .select('*');

      // Fetch at-risk students
      const { data: riskData } = await supabase
        .from('risk_assessments')
        .select(`
          *,
          student:student_id (
            id,
            full_name,
            email
          )
        `)
        .eq('risk_level', 'high')
        .order('assessment_date', { ascending: false });

      if (overviewData) {
        const activeStudents = overviewData.filter(s => s.completion_rate > 0).length;
        const avgCompletion = overviewData.reduce((acc, curr) => acc + curr.completion_rate, 0) / overviewData.length;
        const highRisk = overviewData.filter(s => s.risk_level === 'high').length;

        setStats({
          totalStudents: overviewData.length,
          activeStudents,
          completionRate: Math.round(avgCompletion),
          atRiskStudents: highRisk,
          pendingInterventions: 0, // TODO: Add interventions count
          averageEngagement: Math.round(overviewData.reduce((acc, curr) => acc + curr.engagement_score, 0) / overviewData.length),
        });
      }

      if (cohortData) {
        setCohortMetrics(cohortData);
      }

      if (riskData) {
        setAtRiskStudents(riskData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  const overviewStats = [
    {
      name: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-blue-500',
      change: '+5%',
      changeType: 'increase'
    },
    {
      name: 'Completion Rate',
      value: `${stats.completionRate}%`,
      icon: CheckCircle2,
      color: 'bg-green-500',
      change: '+2%',
      changeType: 'increase'
    },
    {
      name: 'At Risk Students',
      value: stats.atRiskStudents,
      icon: AlertCircle,
      color: 'bg-red-500',
      change: '-1',
      changeType: 'decrease'
    },
    {
      name: 'Avg Engagement',
      value: `${stats.averageEngagement}%`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: '+3%',
      changeType: 'increase'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Student Performance Overview</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 truncate">{stat.name}</p>
                    <div className="mt-1 flex items-baseline">
                      <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                      <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'increase' ? 'text-green-600' :
                        stat.changeType === 'decrease' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {stat.change}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8">
        {/* At Risk Students */}
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">At Risk Students</h2>
            <div className="mt-6 flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {atRiskStudents.map((assessment) => (
                  <li
                    key={assessment.id}
                    className="py-4 hover:bg-gray-50 rounded-lg transition-colors duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {assessment.student.full_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {assessment.student.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          High Risk
                        </span>
                        <button
                          onClick={() => {/* TODO: Implement intervention creation */}}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Create Intervention
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Cohort Performance */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Cohort Performance</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cohort
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Students
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Rate
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Engagement
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      At Risk
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cohortMetrics.map((cohort) => (
                    <tr key={cohort.cohort} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cohort.cohort}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cohort.totalStudents}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900">{cohort.avgCompletionRate}%</span>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 rounded-full h-2"
                              style={{ width: `${cohort.avgCompletionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900">{cohort.avgEngagementScore}%</span>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 rounded-full h-2"
                              style={{ width: `${cohort.avgEngagementScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cohort.riskPercentage > 20 ? 'bg-red-100 text-red-800' :
                          cohort.riskPercentage > 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {cohort.highRiskStudents} ({cohort.riskPercentage}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}