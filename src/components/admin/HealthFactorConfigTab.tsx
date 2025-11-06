/**
 * Health Factor Configuration Tab
 * Allows admins to configure health score factors and point values
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface HealthFactor {
  id: string;
  factor_code: string;
  factor_name: string;
  description: string;
  category: 'negative' | 'positive' | 'neutral';
  default_points: number;
  aggregation_method: 'per_occurrence' | 'once_per_period' | 'cumulative';
  implementation_status: 'active' | 'detected_only' | 'planned';
  enabled: boolean;
  max_occurrences_per_period?: number;
  display_order: number;
}

const HealthFactorConfigTab: React.FC = () => {
  const { getToken } = useAuth();
  const [factors, setFactors] = useState<HealthFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadFactors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFactors = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch('/api/admin/health-factors', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch health factors');
      }

      const data = await response.json();
      setFactors(data.factors || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load health factors: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFactor = async (factor: HealthFactor) => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const token = await getToken();
      const response = await fetch('/api/admin/health-factors', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ factor }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update health factor');
      }

      setSuccessMessage(`Updated ${factor.factor_name} successfully!`);
      setEditingId(null);
      await loadFactors();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to save: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePointsChange = (id: string, newPoints: number) => {
    setFactors(factors.map(f => f.id === id ? { ...f, default_points: newPoints } : f));
  };

  const handleEnabledToggle = (id: string) => {
    setFactors(factors.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const getCategoryBadge = (category: string) => {
    const badges = {
      negative: 'bg-red-100 text-red-800',
      positive: 'bg-green-100 text-green-800',
      neutral: 'bg-gray-100 text-gray-800',
    };
    return badges[category as keyof typeof badges] || badges.neutral;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      detected_only: 'bg-yellow-100 text-yellow-800',
      planned: 'bg-gray-100 text-gray-800',
    };
    return badges[status as keyof typeof badges] || badges.planned;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading health factors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Health Score Factors</h2>
            <p className="text-sm text-gray-600 mt-1">Configure point values and enable/disable factors</p>
          </div>
          <button
            onClick={loadFactors}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Total Factors</p>
            <p className="text-2xl font-bold text-gray-900">{factors.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {factors.filter(f => f.implementation_status === 'active').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Enabled</p>
            <p className="text-2xl font-bold text-indigo-600">
              {factors.filter(f => f.enabled).length}
            </p>
          </div>
        </div>
      </div>

      {/* Factors List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700 w-8">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300"
                    checked={factors.filter(f => f.enabled).length === factors.length}
                    onChange={(e) => {
                      const allEnabled = e.target.checked;
                      setFactors(factors.map(f => ({ ...f, enabled: allEnabled })));
                    }}
                  />
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Factor</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Category</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-700">Points</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Aggregation</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {factors.map((factor) => (
                <tr key={factor.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-4 px-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300"
                      checked={factor.enabled}
                      onChange={() => handleEnabledToggle(factor.id)}
                    />
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-semibold text-gray-900">{factor.factor_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{factor.description}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryBadge(factor.category)}`}>
                      {factor.category}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(factor.implementation_status)}`}>
                      {factor.implementation_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {editingId === factor.id ? (
                      <input
                        type="number"
                        value={factor.default_points}
                        onChange={(e) => handlePointsChange(factor.id, parseInt(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                        autoFocus
                      />
                    ) : (
                      <span className={`text-lg font-bold ${factor.default_points > 0 ? 'text-green-600' : factor.default_points < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {factor.default_points > 0 ? '+' : ''}{factor.default_points}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-xs text-gray-600">{factor.aggregation_method.replace('_', ' ')}</span>
                    {factor.max_occurrences_per_period && (
                      <p className="text-xs text-gray-400 mt-1">max: {factor.max_occurrences_per_period}</p>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {editingId === factor.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSaveFactor(factor)}
                          disabled={saving}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            loadFactors();
                          }}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingId(factor.id)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save All Button */}
      <div className="flex justify-end">
        <button
          onClick={async () => {
            for (const factor of factors) {
              await handleSaveFactor(factor);
            }
          }}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
        >
          {saving ? 'Saving All...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
};

export default HealthFactorConfigTab;
