import React from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ChevronRight
} from 'lucide-react';
import type { PerformanceAlert } from '../../types';

interface PerformanceAlertsProps {
  alerts: PerformanceAlert[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}

export function PerformanceAlerts({ alerts, onAcknowledge, onResolve }: PerformanceAlertsProps) {
  const getAlertIcon = (type: string, severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Performance Alerts</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {alerts.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Alerts</h3>
            <p className="mt-1 text-sm text-gray-500">
              All performance metrics are within acceptable ranges.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 ${getAlertColor(alert.severity)} transition-colors duration-150`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getAlertIcon(alert.alert_type, alert.severity)}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {alert.message}
                    </p>
                    <div className="ml-4 flex-shrink-0 flex">
                      {!alert.acknowledged_at && (
                        <button
                          onClick={() => onAcknowledge(alert.id)}
                          className="mr-2 bg-white rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Acknowledge
                        </button>
                      )}
                      {!alert.resolved_at && (
                        <button
                          onClick={() => onResolve(alert.id)}
                          className="bg-white rounded-md text-sm font-medium text-green-600 hover:text-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="truncate">
                        Created {formatDate(alert.created_at)}
                      </span>
                      {alert.acknowledged_at && (
                        <span className="ml-2 flex items-center text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Acknowledged
                        </span>
                      )}
                      {alert.resolved_at && (
                        <span className="ml-2 flex items-center text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Resolved
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}