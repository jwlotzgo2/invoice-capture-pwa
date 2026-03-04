'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface FieldAccuracy {
  field_name: string;
  total_invoices: number;
  corrections: number;
  accuracy_percentage: number;
}

interface Trend {
  date: string;
  corrections: number;
}

interface AnalyticsData {
  period: { days: number; startDate: string };
  overview: {
    totalInvoices: number;
    totalCorrections: number;
    overallAccuracy: number;
  };
  fieldAccuracy: FieldAccuracy[];
  mostCorrectedFields: { field: string; corrections: number }[];
  trends: Trend[];
  recentEdits: {
    id: string;
    field_name: string;
    original_value: string | null;
    edited_value: string | null;
    created_at: string;
  }[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const router = useRouter();

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?days=${days}`);
      if (response.status === 403) {
        router.push('/invoices');
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch analytics');

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatFieldName = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyBg = (accuracy: number) => {
    if (accuracy >= 90) return 'bg-green-500';
    if (accuracy >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-gray-900">{error}</h2>
        <button
          onClick={() => router.push('/admin')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">OCR Analytics</h1>
                <p className="text-sm text-gray-500">Scan accuracy monitoring</p>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : data ? (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <OverviewCard
                icon={<Target className="text-blue-600" size={24} />}
                label="Overall Accuracy"
                value={`${data.overview.overallAccuracy.toFixed(1)}%`}
                color={getAccuracyColor(data.overview.overallAccuracy)}
              />
              <OverviewCard
                icon={<BarChart3 className="text-purple-600" size={24} />}
                label="Total Invoices"
                value={data.overview.totalInvoices.toString()}
              />
              <OverviewCard
                icon={<AlertTriangle className="text-orange-600" size={24} />}
                label="Total Corrections"
                value={data.overview.totalCorrections.toString()}
              />
              <OverviewCard
                icon={
                  data.overview.overallAccuracy >= 85 ? (
                    <TrendingUp className="text-green-600" size={24} />
                  ) : (
                    <TrendingDown className="text-red-600" size={24} />
                  )
                }
                label="Performance"
                value={data.overview.overallAccuracy >= 85 ? 'Good' : 'Needs Improvement'}
                color={data.overview.overallAccuracy >= 85 ? 'text-green-600' : 'text-red-600'}
              />
            </div>

            {/* Field Accuracy */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Accuracy by Field</h3>
              <div className="space-y-4">
                {data.fieldAccuracy.map((field) => (
                  <div key={field.field_name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {formatFieldName(field.field_name)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {field.corrections} corrections
                        </span>
                        <span className={`text-sm font-semibold ${getAccuracyColor(field.accuracy_percentage)}`}>
                          {field.accuracy_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getAccuracyBg(field.accuracy_percentage)} rounded-full transition-all duration-500`}
                        style={{ width: `${field.accuracy_percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Most Corrected Fields */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Most Corrected Fields</h3>
                {data.mostCorrectedFields.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
                    <p className="text-gray-500">No corrections recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.mostCorrectedFields.slice(0, 5).map((item, index) => (
                      <div
                        key={item.field}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                            {index + 1}
                          </span>
                          <span className="text-gray-900">{formatFieldName(item.field)}</span>
                        </div>
                        <span className="text-sm font-medium text-orange-600">
                          {item.corrections} corrections
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Correction Trends */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Correction Trends</h3>
                {data.trends.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-gray-500">No data available</p>
                  </div>
                ) : (
                  <div className="h-48 flex items-end gap-1">
                    {data.trends.slice(-14).map((day) => {
                      const maxCorrections = Math.max(...data.trends.map((t) => t.corrections), 1);
                      const height = (day.corrections / maxCorrections) * 100;
                      return (
                        <div
                          key={day.date}
                          className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer group relative"
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${day.date}: ${day.corrections} corrections`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {day.corrections}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{data.trends[0]?.date || ''}</span>
                  <span>{data.trends[data.trends.length - 1]?.date || ''}</span>
                </div>
              </div>
            </div>

            {/* Recent Corrections */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Corrections</h3>
              {data.recentEdits.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
                  <p className="text-gray-500">No recent corrections</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">
                          Field
                        </th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">
                          Original
                        </th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">
                          Corrected
                        </th>
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.recentEdits.slice(0, 10).map((edit) => (
                        <tr key={edit.id}>
                          <td className="py-3 text-sm text-gray-900">
                            {formatFieldName(edit.field_name)}
                          </td>
                          <td className="py-3 text-sm text-red-600 max-w-32 truncate">
                            {edit.original_value || '-'}
                          </td>
                          <td className="py-3 text-sm text-green-600 max-w-32 truncate">
                            {edit.edited_value || '-'}
                          </td>
                          <td className="py-3 text-sm text-gray-500">
                            {new Date(edit.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  color = 'text-gray-900',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
