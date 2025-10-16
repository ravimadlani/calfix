/**
 * ActionItemsPanel Component
 * Displays actionable recommendations based on calendar analysis
 */



const ActionItemsPanel = ({ recommendations, insights }) => {
  if ((!recommendations || recommendations.length === 0) && (!insights || insights.length === 0)) {
    return null;
  }

  const displayItems = [...(recommendations || []), ...(insights || [])].slice(0, 5);

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl" role="img" aria-label="Warning">
          ⚡
        </span>
        <h2 className="text-xl font-bold text-gray-900">
          Action Items & Insights
        </h2>
      </div>

      <div className="space-y-3">
        {displayItems.map((item, index) => {
          const colorClasses = {
            red: 'bg-red-100 text-red-800 border-red-300',
            orange: 'bg-orange-100 text-orange-800 border-orange-300',
            yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            green: 'bg-green-100 text-green-800 border-green-300',
            blue: 'bg-slate-100 text-slate-800 border-slate-300'
          };

          const itemColor = item.color || 'blue';
          const itemClass = colorClasses[itemColor] || colorClasses.blue;

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${itemClass} hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0" role="img" aria-label="Icon">
                  {item.icon}
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {item.title || item.message}
                  </h3>
                  {item.description && (
                    <p className="mt-1 text-sm opacity-90">
                      {item.description}
                    </p>
                  )}
                  {item.recommendation && (
                    <p className="mt-1 text-sm italic">
                      💡 {item.recommendation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayItems.length === 0 && (
        <div className="text-center py-4 text-gray-600">
          <span className="text-4xl block mb-2" role="img" aria-label="Success">
            ✅
          </span>
          <p className="font-medium">Great! No immediate action items.</p>
          <p className="text-sm mt-1">Your calendar is looking healthy.</p>
        </div>
      )}
    </div>
  );
};

export default ActionItemsPanel;
