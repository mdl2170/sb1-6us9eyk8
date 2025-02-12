import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Briefcase, Users, BarChart, Target } from 'lucide-react';
import { CareerGoalsPanel } from '../components/job-search/CareerGoalsPanel';
import { ApplicationsPanel } from '../components/job-search/ApplicationsPanel';
import { NetworkingPanel } from '../components/job-search/NetworkingPanel';
import { ProgressPanel } from '../components/job-search/ProgressPanel';

export function JobSearch() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('goals');

  const tabs = [
    {
      id: 'goals',
      name: 'Career Goals',
      icon: Target,
      component: CareerGoalsPanel
    },
    {
      id: 'applications',
      name: 'Applications',
      icon: Briefcase,
      component: ApplicationsPanel
    },
    {
      id: 'networking',
      name: 'Networking',
      icon: Users,
      component: NetworkingPanel
    },
    {
      id: 'progress',
      name: 'Progress',
      icon: BarChart,
      component: ProgressPanel
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || CareerGoalsPanel;

  return (
    <div className="min-h-screen bg-gray-50 -mt-8 -mx-8 -mb-8">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Job Search Tracker</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track your job search progress, manage applications, and grow your professional network
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${isActive
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon
                      className={`
                        -ml-0.5 mr-2 h-5 w-5
                        ${isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
                      `}
                    />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
}