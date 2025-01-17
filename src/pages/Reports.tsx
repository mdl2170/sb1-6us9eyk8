import React from 'react';
import { BarChart, LineChart, Clock } from 'lucide-react';

export function Reports() {
  const reports = [
    {
      title: 'Task Completion Rate',
      description: 'View your task completion statistics',
      icon: BarChart,
      stats: '85%',
      change: '+5%',
      changeType: 'increase'
    },
    {
      title: 'Study Hours',
      description: 'Track your study time',
      icon: Clock,
      stats: '24.5',
      change: '+2.5',
      changeType: 'increase'
    },
    {
      title: 'Project Progress',
      description: 'Monitor your project milestones',
      icon: LineChart,
      stats: '4/5',
      change: '80%',
      changeType: 'neutral'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="mt-2 text-gray-600">Track your progress and performance</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.title}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {report.title}
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {report.stats}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span
                    className={`font-medium ${
                      report.changeType === 'increase'
                        ? 'text-green-600'
                        : report.changeType === 'decrease'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {report.change}
                  </span>
                  <span className="text-gray-500 ml-2">from last week</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly Activity Chart Placeholder */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Activity</h2>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Activity chart will be displayed here</p>
        </div>
      </div>
    </div>
  );
}