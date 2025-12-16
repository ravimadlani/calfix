/**
 * DashboardSkeleton Component
 * Shows a skeleton loading state for the dashboard to prevent flicker
 */

import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-80" />
      </div>

      {/* Calendar selector skeleton */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-48 bg-gray-200 rounded" />
            <div className="h-10 w-32 bg-gray-200 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      {/* Health score hero skeleton */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
            <div className="h-12 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-64" />
          </div>
          <div className="w-32 h-32 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* View selector skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded" />
      </div>

      {/* Event list skeleton */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-40" />
        </div>
        <div className="divide-y divide-gray-200">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-16 flex-shrink-0">
                <div className="h-4 bg-gray-200 rounded w-12" />
                <div className="h-3 bg-gray-200 rounded w-10 mt-1" />
              </div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded" />
                <div className="h-8 w-8 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
