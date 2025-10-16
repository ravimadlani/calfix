/**
 * ViewSelector Component
 * Pills/buttons for selecting calendar view (Today, Tomorrow, This Week, Next Week)
 */



const ViewSelector = ({ currentView, onViewChange }) => {
  const views = [
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'week', label: 'This Week' },
    { id: 'nextWeek', label: 'Next Week' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'nextMonth', label: 'Next Month' }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`
            px-6 py-2 rounded-full font-medium transition-all duration-200
            ${currentView === view.id
              ? 'bg-slate-700 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }
          `}
          aria-label={`View ${view.label}`}
          aria-pressed={currentView === view.id}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
};

export default ViewSelector;
