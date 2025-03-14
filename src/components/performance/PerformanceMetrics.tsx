import React, { useEffect, useState } from 'react';
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
import { supabase } from '../../lib/supabase';
import { useToastStore } from '../../stores/useToastStore';

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
  studentId: string;
  onCreateAlert?: () => void;
}

export function PerformanceMetrics({ studentId, onCreateAlert }: PerformanceMetricsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);
  const { addToast } = useToastStore();

  useEffect(() => {
    loadPerformanceData();
  }, [studentId]);

  const loadPerformanceData = async () => {
    try {
      setIsLoading(true);

      // Fetch all performance reviews for the student
      const { data: reviews, error } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('student_id', studentId)
        .order('review_date');

      if (error) throw error;

      if (!reviews || reviews.length === 0) {
        setChartData(null);
        return;
      }

      // Process the data for the chart
      const labels = reviews.map(review => {
        const date = new Date(review.review_date);
        return date.toLocaleDateString('en-US', { 
          month: 'short',
          year: date.getFullYear() !== new Date().getFullYear() ? '2-digit' : undefined 
        });
      }
      );

      const datasets = [
        {
          label: 'Resume Quality',
          data: reviews.map(r => r.resume_quality),
          borderColor: 'rgb(59 130 246)', // blue
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.4
        },
        {
          label: 'Application Effectiveness',
          data: reviews.map(r => r.application_effectiveness),
          borderColor: 'rgb(34 197 94)', // green
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          tension: 0.4
        },
        {
          label: 'Behavioral Performance',
          data: reviews.map(r => r.behavioral_performance),
          borderColor: 'rgb(234 179 8)', // yellow
          backgroundColor: 'rgba(234, 179, 8, 0.5)',
          tension: 0.4
        },
        {
          label: 'Networking Capability',
          data: reviews.map(r => r.networking_capability),
          borderColor: 'rgb(236 72 153)', // pink
          backgroundColor: 'rgba(236, 72, 153, 0.5)',
          tension: 0.4
        },
        {
          label: 'Technical Proficiency',
          data: reviews.map(r => r.technical_proficiency),
          borderColor: 'rgb(168 85 247)', // purple
          backgroundColor: 'rgba(168, 85, 247, 0.5)',
          tension: 0.4
        },
        {
          label: 'Energy Level',
          data: reviews.map(r => r.energy_level),
          borderColor: 'rgb(239 68 68)', // red
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          tension: 0.4
        }
      ];

      setChartData({ labels, datasets });
    } catch (err) {
      console.error('Error loading performance data:', err);
      addToast('Failed to load performance data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const,
        labels: {
          boxWidth: 10,
          usePointStyle: true,
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
          stepSize: 1
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No performance data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}