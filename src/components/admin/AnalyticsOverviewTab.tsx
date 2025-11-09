/**
 * Analytics Overview Tab
 * Shows system-wide action metrics and trends
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface TrendData {
  date: string;
  actions: number;
  trend: number;
}

interface CategoryData {
  category: string;
  rawCategory: string;
  count: number;
  percentage: number;
}

const AnalyticsOverviewTab: React.FC = () => {
  const { getToken } = useAuth();
  const [stats, setStats] = useState({
    totalActions: 0,
    totalActionsTrend: 0,
    activeUsers: 0,
    activeUsersTrend: 0,
    avgHealthScore: 0,
    avgHealthScoreTrend: 0,
    errorRate: 0,
    errorRateTrend: 0,
    totalErrors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryData[]>([]);

  useEffect(() => {
    loadAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const token = await getToken();
      const response = await fetch('/api/admin/analytics', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const data = await response.json();

      setStats(data.stats);
      setTrendData(data.trendData);
      setCategoryDistribution(data.categoryDistribution);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'quick_action': 'bg-indigo-600',
      'workflow': 'bg-purple-600',
      'calendar_write': 'bg-green-600',
      'calendar_read': 'bg-blue-600',
      'analytics': 'bg-yellow-600',
      'meeting_management': 'bg-orange-600',
      'team_scheduling': 'bg-pink-600',
      'authentication': 'bg-cyan-600',
      'preferences': 'bg-teal-600',
      'error': 'bg-red-600',
      'other': 'bg-slate-600',
    };
    return colors[category] || 'bg-slate-600';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Actions</p>
              </div>
            </div>
            <span className={`text-sm font-semibold ${stats.totalActionsTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.totalActionsTrend > 0 ? '↑' : '↓'} {Math.abs(stats.totalActionsTrend)}%
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.totalActions.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Active Users</p>
              </div>
            </div>
            <span className="text-green-600 text-sm font-semibold">↑ {stats.activeUsersTrend}%</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.activeUsers.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Avg Health Score</p>
              </div>
            </div>
            <span className="text-green-600 text-sm font-semibold">↑ {stats.avgHealthScoreTrend}</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.avgHealthScore}</p>
          <p className="text-xs text-slate-500 mt-2">Score range: 0-100</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Error Rate</p>
              </div>
            </div>
            <span className="text-green-600 text-sm font-semibold">↓ {Math.abs(stats.errorRateTrend)}%</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.errorRate}%</p>
          <p className="text-xs text-slate-500 mt-2">{stats.totalErrors || 0} errors total</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Trends */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Action Trends (Last 7 Days)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Actions</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Trend</th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((row, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-800">{row.date}</td>
                    <td className="py-3 px-4 text-sm text-slate-800 text-right font-semibold">
                      {row.actions.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-semibold ${row.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {row.trend > 0 ? '↑' : '↓'} {Math.abs(row.trend)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Action Distribution by Category</h2>
          <div className="space-y-4">
            {categoryDistribution.map((category, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-700">{category.category}</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {category.percentage}% ({category.count.toLocaleString()})
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div className={`${getCategoryColor(category.rawCategory)} h-3 rounded-full`} style={{ width: `${category.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverviewTab;
