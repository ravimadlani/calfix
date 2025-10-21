/**
 * DayActionsPanel Component
 * Displays specific proposed actions for the selected day based on calendar analysis
 */



const DayActionsPanel = ({ analytics, recommendations, viewLabel, selectedDayDate, onActionClick }) => {
  if (!analytics) return null;

  // Format display label with date if available
  const displayLabel = selectedDayDate
    ? `${viewLabel} (${selectedDayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
    : viewLabel;

  // Combine insights and recommendations into actionable items
  const actionableItems = [];

  // Add CRITICAL double bookings first
  if (analytics.doubleBookingCount > 0) {
    actionableItems.push({
      priority: 'critical',
      icon: '🚨',
      title: `${analytics.doubleBookingCount} Double Booking${analytics.doubleBookingCount > 1 ? 's' : ''} Detected!`,
      description: 'You have overlapping events scheduled at the same time',
      action: 'Review and reschedule conflicting events immediately',
      color: 'bg-red-100 border-red-500 text-red-900',
      actionType: 'double-booking',
      clickable: true
    });
  }

  // International flights without location tracking
  if (analytics.internationalFlightsNeedingLocationCount > 0) {
    actionableItems.push({
      priority: 'high',
      icon: '🌍',
      title: `${analytics.internationalFlightsNeedingLocationCount} International Flight${analytics.internationalFlightsNeedingLocationCount > 1 ? 's' : ''} Without Location`,
      description: 'International flights missing location/timezone tracking',
      action: 'Add location events to track where you are',
      color: 'bg-slate-100 border-slate-400 text-slate-900',
      actionType: 'international-flights-location',
      clickable: true
    });
  }

  // Flights without travel blocks
  if (analytics.flightsNeedingTravelBlockCount > 0) {
    actionableItems.push({
      priority: 'high',
      icon: '✈️',
      title: `${analytics.flightsNeedingTravelBlockCount} Flight${analytics.flightsNeedingTravelBlockCount > 1 ? 's' : ''} Without Travel Blocks`,
      description: 'Flights missing 90-minute travel blocks before or after',
      action: 'Add travel blocks to account for airport time',
      color: 'bg-slate-100 border-slate-400 text-slate-900',
      actionType: 'flights-travel-blocks',
      clickable: true
    });
  }

  // Declined two-person meetings
  if (analytics.declinedMeetingCount > 0) {
    actionableItems.push({
      priority: 'high',
      icon: '❌',
      title: `${analytics.declinedMeetingCount} Declined Meeting${analytics.declinedMeetingCount > 1 ? 's' : ''}`,
      description: 'Two-person meetings where one or both parties declined',
      action: 'Review and remove these meetings from your calendar',
      color: 'bg-red-100 border-red-400 text-red-900',
      actionType: 'declined-meetings',
      clickable: true
    });
  }

  // Out of hours meetings in foreign timezone
  if (analytics.outOfHoursMeetingCount > 0) {
    actionableItems.push({
      priority: 'high',
      icon: '🌙',
      title: `${analytics.outOfHoursMeetingCount} Out of Hours Meeting${analytics.outOfHoursMeetingCount > 1 ? 's' : ''} in Foreign Timezone`,
      description: 'Meetings scheduled outside business hours while traveling abroad',
      action: 'Reschedule to reasonable local hours or decline',
      color: 'bg-amber-100 border-amber-400 text-amber-900',
      actionType: 'out-of-hours-foreign',
      clickable: true
    });
  }

  // Missing video links
  if (analytics.missingVideoLinkCount > 0) {
    actionableItems.push({
      priority: 'high',
      icon: '🎥',
      title: `${analytics.missingVideoLinkCount} Meeting${analytics.missingVideoLinkCount > 1 ? 's' : ''} Without Video Links`,
      description: 'These meetings appear to be missing video conferencing information',
      action: 'Add Zoom/Meet/Teams links to avoid confusion',
      color: 'bg-orange-100 border-orange-400 text-orange-900',
      actionType: 'missing-video',
      clickable: true
    });
  }

  // Add critical issues
  if (analytics.backToBackCount > 0) {
    actionableItems.push({
      priority: 'high',
      icon: '🔴',
      title: `${analytics.backToBackCount} Back-to-Back Meeting${analytics.backToBackCount > 1 ? 's' : ''}`,
      description: 'No buffer time between meetings can lead to burnout',
      action: 'Add 15-minute buffers between meetings',
      color: 'bg-red-50 border-red-300 text-red-900',
      actionType: 'back-to-back',
      clickable: true
    });
  }

  if (analytics.insufficientBufferCount > 0) {
    actionableItems.push({
      priority: 'medium',
      icon: '🟡',
      title: `${analytics.insufficientBufferCount} Insufficient Buffer${analytics.insufficientBufferCount > 1 ? 's' : ''}`,
      description: 'Less than 10 minutes between meetings',
      action: 'Extend buffers to 10-15 minutes',
      color: 'bg-orange-50 border-orange-300 text-orange-900',
      actionType: 'insufficient-buffer',
      clickable: true
    });
  }

  // Recurring meetings health issues
  if (analytics.recurringWithoutVideoLinks && analytics.recurringWithoutVideoLinks.length > 0) {
    actionableItems.push({
      priority: 'medium',
      icon: '🔄',
      title: `${analytics.recurringWithoutVideoLinks.length} Recurring Series Without Video Links`,
      description: 'Regular meetings missing video conference information',
      action: 'Add video links to recurring meeting series',
      color: 'bg-purple-50 border-purple-300 text-purple-900',
      actionType: 'recurring-no-video',
      clickable: false
    });
  }

  if (analytics.recurringCausingBackToBack && analytics.recurringCausingBackToBack.length > 0) {
    actionableItems.push({
      priority: 'medium',
      icon: '🔄',
      title: `${analytics.recurringCausingBackToBack.length} Recurring Series Causing Back-to-Back`,
      description: 'Regular meetings creating scheduling conflicts',
      action: 'Review recurring meeting times and durations',
      color: 'bg-purple-50 border-purple-300 text-purple-900',
      actionType: 'recurring-back-to-back',
      clickable: false
    });
  }

  if (analytics.staleRecurringSeries && analytics.staleRecurringSeries.length > 0) {
    actionableItems.push({
      priority: 'medium',
      icon: '⏸️',
      title: `${analytics.staleRecurringSeries.length} Stale Recurring Series`,
      description: 'Meeting series with no instances in 30+ days',
      action: 'Review and archive inactive recurring meetings',
      color: 'bg-gray-50 border-gray-300 text-gray-900',
      actionType: 'recurring-stale',
      clickable: false
    });
  }

  // Focus time recommendations
  if (analytics.focusBlockCount === 0 && analytics.totalEvents > 0) {
    actionableItems.push({
      priority: 'high',
      icon: '🎯',
      title: 'No Focus Time Blocks',
      description: 'No gaps of 60+ minutes for deep work',
      action: 'Schedule at least 1-2 hours for focused tasks',
      color: 'bg-yellow-50 border-yellow-300 text-yellow-900'
    });
  } else if (analytics.focusBlockCount > 0) {
    actionableItems.push({
      priority: 'positive',
      icon: '✅',
      title: `${analytics.focusBlockCount} Focus Block${analytics.focusBlockCount > 1 ? 's' : ''} Available`,
      description: 'Great opportunity for deep work',
      action: 'Use for important projects or strategic thinking',
      color: 'bg-green-50 border-green-300 text-green-900'
    });
  }


  // Add recommendation-based actions (skip duplicates we already added from analytics)
  if (recommendations && recommendations.length > 0) {
    const existingTitles = new Set(actionableItems.map(item => item.title.toLowerCase()));

    recommendations.slice(0, 2).forEach(rec => {
      if (rec.type !== 'success') { // Skip success messages as we already show them
        // Skip if we already added this recommendation from analytics
        const titleLower = rec.title.toLowerCase();
        if (titleLower.includes('back-to-back') ||
            titleLower.includes('insufficient buffer') ||
            titleLower.includes('double booking') ||
            titleLower.includes('declined') ||
            titleLower.includes('video link') ||
            titleLower.includes('high meeting load')) {
          return; // Skip this recommendation
        }

        const colorMap = {
          'high-priority': 'bg-red-50 border-red-300 text-red-900',
          'medium-priority': 'bg-orange-50 border-orange-300 text-orange-900',
          'low-priority': 'bg-slate-50 border-slate-300 text-slate-900'
        };

        actionableItems.push({
          priority: rec.type,
          icon: rec.icon,
          title: rec.title,
          description: rec.description,
          action: getActionText(rec.action),
          color: colorMap[rec.type] || 'bg-slate-50 border-slate-300 text-slate-900'
        });
      }
    });
  }

  // If no issues, show positive message
  if (actionableItems.length === 0) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="text-center">
          <span className="text-6xl block mb-4" role="img" aria-label="Success">
            🎉
          </span>
          <h2 className="text-3xl font-bold mb-2">
            Excellent Calendar Health!
          </h2>
          <p className="text-lg opacity-90">
            Your schedule for {displayLabel} is well-balanced with good buffers and focus time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl shadow-xl p-8 text-white">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl" role="img" aria-label="Target">
          🎯
        </span>
        <h2 className="text-2xl font-bold">
          Proposed Actions for {displayLabel}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actionableItems.map((item, index) => (
          <div
            key={index}
            onClick={() => item.clickable && onActionClick && onActionClick(item.actionType)}
            className={`
              ${item.color} backdrop-blur-sm rounded-xl p-5 border-2
              transition-all duration-200
              ${item.clickable ? 'hover:scale-[1.01] cursor-pointer hover:shadow-lg' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0" role="img" aria-label={item.title}>
                {item.icon}
              </span>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">
                  {item.title}
                </h3>
                <p className="text-sm mb-2 opacity-90">
                  {item.description}
                </p>
                <div className="flex items-start gap-2 mt-2">
                  <span className="text-lg flex-shrink-0">→</span>
                  <p className="text-sm font-semibold">
                    {item.action}
                  </p>
                </div>
                {item.clickable && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <span className="text-xs font-bold uppercase opacity-75 flex items-center gap-1">
                      Click to take action
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {actionableItems.length > 0 && (
        <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
          <p className="text-sm text-center">
            <strong>💡 Tip:</strong> Use the action buttons on each event card to make these improvements
          </p>
        </div>
      )}
    </div>
  );
};

// Helper function to get action text
const getActionText = (actionType) => {
  const actionMap = {
    'add-buffers': 'Click "Add Buffers to All Back-to-Back" below',
    'extend-buffers': 'Use event action buttons to add buffers',
    'add-focus-time': 'Click "Block Focus Time Tomorrow" below',
    'review-meetings': 'Review optional meetings and consider declining',
    'none': 'Keep up the good work!'
  };

  return actionMap[actionType] || 'Review your calendar and make adjustments';
};

export default DayActionsPanel;
