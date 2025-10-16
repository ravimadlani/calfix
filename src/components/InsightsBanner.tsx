/**
 * InsightsBanner Component
 * Displays best practice tips and calendar management advice in a gradient banner
 */



const InsightsBanner = () => {
  const bestPractices = [
    {
      icon: '📅',
      title: 'Daily Review Ritual',
      description: 'Review calendar each morning AND 30 mins before EOD',
      color: 'from-slate-600 to-slate-700'
    },
    {
      icon: '⏰',
      title: 'Buffer Time',
      description: 'Add 10-15 min gaps between meetings to prevent burnout',
      color: 'from-slate-600 to-slate-700'
    },
    {
      icon: '🎯',
      title: 'Focus Blocks',
      description: 'Protect 1-2 hour chunks for deep work during peak energy',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: '📊',
      title: 'Weekly Planning',
      description: 'Spend 30-60 mins every Friday planning next week',
      color: 'from-pink-500 to-pink-600'
    }
  ];

  return (
    <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl shadow-xl p-8 text-white">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl" role="img" aria-label="Light bulb">
          💡
        </span>
        <h2 className="text-2xl font-bold">
          Calendar Management Best Practices
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {bestPractices.map((practice, index) => (
          <div
            key={index}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-5 hover:bg-white/20 transition-all duration-200 hover:scale-[1.01]"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0" role="img" aria-label={practice.title}>
                {practice.icon}
              </span>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  {practice.title}
                </h3>
                <p className="text-sm text-white/90">
                  {practice.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
        <p className="text-sm text-center">
          <strong>Pro Tip:</strong> Research shows that well-managed calendars lead to 23% higher productivity and significantly reduced stress levels.
        </p>
      </div>
    </div>
  );
};

export default InsightsBanner;
