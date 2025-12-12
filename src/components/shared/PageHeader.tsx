import React from 'react';
import type { PageHeaderProps } from './types';

/**
 * PageHeader - A shared component for consistent page headers across the app.
 *
 * Features:
 * - Title and optional description
 * - Optional navigation tabs
 * - Optional actions slot
 * - Two variants: inline (no background) and sticky (white bg with border)
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  tabs,
  actions,
  variant = 'inline',
  className = '',
}) => {
  if (variant === 'sticky') {
    return (
      <div className={`bg-white border-b border-gray-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              {description && (
                <p className="text-sm text-slate-600 mt-1">
                  {typeof description === 'string' ? description : description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-3">
                {actions}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="mt-4 flex gap-1 border-b border-gray-200 -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={tab.onClick}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    tab.active
                      ? 'bg-white border border-gray-200 border-b-white text-slate-700 -mb-px'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-current={tab.active ? 'page' : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline variant (default) - no background wrapper
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="text-slate-600 text-sm mt-1">
              {typeof description === 'string' ? description : description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>

      {/* Navigation Tabs for inline variant */}
      {tabs && tabs.length > 0 && (
        <div className="flex gap-2 mt-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={tab.onClick}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                tab.active
                  ? 'border-slate-500 bg-slate-50 text-slate-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              aria-current={tab.active ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
