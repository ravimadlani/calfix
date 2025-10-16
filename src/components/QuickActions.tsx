/**
 * QuickActions Component
 * One-click action buttons for common calendar operations
 */



const QuickActions = ({
  onBlockFocusTime,
  onAddBuffersToBackToBack,
  onClearEvening,
  onOptimizeFriday,
  loading
}) => {
  const actions = [
    {
      id: 'focus',
      icon: '🎯',
      label: 'Block Focus Time Tomorrow',
      description: 'Creates 2-hour focus block',
      onClick: onBlockFocusTime,
      color: 'bg-slate-700 hover:bg-slate-800'
    },
    {
      id: 'buffers',
      icon: '⏰',
      label: 'Add Buffers to All Back-to-Back',
      description: 'Adds 15-min gaps automatically',
      onClick: onAddBuffersToBackToBack,
      color: 'bg-slate-700 hover:bg-slate-800'
    },
    {
      id: 'evening',
      icon: '🌙',
      label: 'Clear Evening After 5pm',
      description: 'Review late meetings',
      onClick: onClearEvening,
      color: 'bg-slate-700 hover:bg-slate-800'
    },
    {
      id: 'friday',
      icon: '📊',
      label: 'Optimize Friday',
      description: 'Move meetings to free afternoon',
      onClick: onOptimizeFriday,
      color: 'bg-green-600 hover:bg-green-700'
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl" role="img" aria-label="Lightning">
          ⚡
        </span>
        <h2 className="text-xl font-bold text-gray-900">
          Quick Actions
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map(action => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={loading}
            className={`
              ${action.color}
              text-white rounded-xl p-5 text-left
              transition-all duration-200
              hover:shadow-lg hover:scale-[1.01]
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
            `}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl" role="img" aria-label={action.label}>
                {action.icon}
              </span>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  {action.label}
                </h3>
                <p className="text-sm opacity-90">
                  {action.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 text-center">
          <strong>Note:</strong> These actions will modify your calendar. You'll see a confirmation before any changes are made.
        </p>
      </div>
    </div>
  );
};

export default QuickActions;
