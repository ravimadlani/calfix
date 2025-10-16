/**
 * StatsCard Component
 * Displays a single statistic with icon and label
 */



const StatsCard = ({ icon, label, value, subtext, color = 'indigo' }) => {
  const colorClasses = {
    indigo: 'bg-slate-100 text-slate-800',
    blue: 'bg-slate-100 text-slate-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-slate-100 text-slate-800'
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value}
          </p>
          {subtext && (
            <p className="mt-1 text-sm text-gray-500">
              {subtext}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color] || colorClasses.indigo}`}>
          <span className="text-2xl" role="img" aria-label={label}>
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
