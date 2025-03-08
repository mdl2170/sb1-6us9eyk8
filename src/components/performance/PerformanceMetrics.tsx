import React from 'react';
import { 
  LineChart
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { PerformanceMetrics as Metrics } from '../../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceMetricsProps {
  metrics: Metrics;
  onCreateAlert?: () => void;
}

export function PerformanceMetrics({ metrics, onCreateAlert }: PerformanceMetricsProps) {
  // Sample data for the chart - replace with actual data from your backend
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Resume Quality',
        data: [4, 4, 4.5, 4.5, 4.5, 4.5],
        borderColor: 'rgb(59 130 246)', // blue
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.4
      },
      {
        label: 'Application Effectiveness',
        data: [3, 3.5, 4, 4, 4, 4],
        borderColor: 'rgb(34 197 94)', // green
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.4
      },
      {
        label: 'Behavioral Performance',
        data: [3.5, 4, 4, 4, 4, 4],
        borderColor: 'rgb(234 179 8)', // yellow
        backgroundColor: 'rgba(234, 179, 8, 0.5)',
        tension: 0.4
      },
      {
        label: 'Networking Capability',
        data: [3, 3.5, 4, 4, 4, 4],
        borderColor: 'rgb(236 72 153)', // pink
        backgroundColor: 'rgba(236, 72, 153, 0.5)',
        tension: 0.4
      },
      {
        label: 'Technical Proficiency',
        data: [3, 3.5, 3.5, 4, 4, 4],
        borderColor: 'rgb(168 85 247)', // purple
        backgroundColor: 'rgba(168, 85, 247, 0.5)',
        tension: 0.4
      },
      {
        label: 'Energy Level',
        data: [4, 4, 4, 4, 4, 4],
        borderColor: 'rgb(239 68 68)', // red
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const,
        labels: {
          boxWidth: 40,
          usePointStyle: false,
          padding: 20
        }
      },
      title: {
        display: false,
        text: 'Performance Trends'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          stepSize: 0.5
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      }
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Performance Metrics</h2>
          {onCreateAlert && (
            <button
              onClick={onCreateAlert}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Alert
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}