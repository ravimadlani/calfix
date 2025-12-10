import { addDays, setHours, setMinutes, isWeekend, nextMonday, nextWednesday, nextFriday } from 'date-fns';
import type { PrefilledSlot } from '../../pages/SchedulePage';
import { useScheduleTemplates } from '../../hooks/useScheduleTemplates';
import type { ScheduleTemplate, TemplateConfig } from '../../types/scheduling';

interface QuickScheduleButtonsProps {
  onSelectSlots: (slots: PrefilledSlot[]) => void;
  onLoadTemplate?: (config: TemplateConfig) => void;
  meetingDuration: number; // in minutes
}

export function QuickScheduleButtons({ onSelectSlots, onLoadTemplate, meetingDuration }: QuickScheduleButtonsProps) {
  const { templates, isLoading: templatesLoading, deleteTemplate } = useScheduleTemplates();
  // Helper to get next N business days starting from tomorrow
  const getNextBusinessDays = (count: number, startDate: Date = new Date()): Date[] => {
    const dates: Date[] = [];
    let current = addDays(startDate, 1); // Start tomorrow

    while (dates.length < count) {
      if (!isWeekend(current)) {
        dates.push(current);
      }
      current = addDays(current, 1);
    }

    return dates;
  };

  // Generate 3 slots this week at 10 AM
  const generateThisWeekSlots = (): PrefilledSlot[] => {
    const businessDays = getNextBusinessDays(3);
    return businessDays.map(day => {
      const start = setMinutes(setHours(day, 10), 0); // 10:00 AM
      const end = addDays(start, 0);
      end.setMinutes(end.getMinutes() + meetingDuration);
      return { start, end: new Date(start.getTime() + meetingDuration * 60 * 1000) };
    });
  };

  // Generate 3 slots next week (Mon, Wed, Fri) at 2 PM
  const generateNextWeekSlots = (): PrefilledSlot[] => {
    const today = new Date();
    const monday = nextMonday(today);
    const wednesday = nextWednesday(today);
    const friday = nextFriday(today);

    // Make sure Wed and Fri are in the same week as Monday
    const targetWednesday = wednesday < monday ? addDays(wednesday, 7) : wednesday;
    const targetFriday = friday < monday ? addDays(friday, 7) : friday;

    return [monday, targetWednesday, targetFriday].map(day => {
      const start = setMinutes(setHours(day, 14), 0); // 2:00 PM
      return { start, end: new Date(start.getTime() + meetingDuration * 60 * 1000) };
    });
  };

  // Generate 3 x 30-min coffee chat slots in next 3 business days
  const generateCoffeeChatSlots = (): PrefilledSlot[] => {
    const businessDays = getNextBusinessDays(3);
    const coffeeDuration = 30; // Always 30 minutes for coffee chats
    return businessDays.map(day => {
      const start = setMinutes(setHours(day, 11), 0); // 11:00 AM - good for coffee
      return { start, end: new Date(start.getTime() + coffeeDuration * 60 * 1000) };
    });
  };

  const quickOptions = [
    {
      id: 'this-week',
      icon: '📅',
      title: '3 slots this week',
      description: 'Next 3 business days at 10 AM',
      generator: generateThisWeekSlots
    },
    {
      id: 'next-week',
      icon: '🗓️',
      title: '3 slots next week',
      description: 'Mon, Wed, Fri at 2 PM',
      generator: generateNextWeekSlots
    },
    {
      id: 'coffee-chat',
      icon: '☕',
      title: 'Coffee chat',
      description: '3 x 30-min slots at 11 AM',
      generator: generateCoffeeChatSlots
    }
  ];

  const handleLoadTemplate = (template: ScheduleTemplate) => {
    if (onLoadTemplate) {
      onLoadTemplate(template.config);
    }
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (confirm('Delete this template?')) {
      await deleteTemplate(templateId);
    }
  };

  // Show user templates first, then built-in options
  const hasUserTemplates = templates.length > 0;

  return (
    <div className="space-y-4">
      {/* User Templates Section */}
      {hasUserTemplates && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Your Templates</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {templates.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleLoadTemplate(template)}
                className="p-5 bg-indigo-50 border-2 border-indigo-100 hover:border-indigo-300 hover:shadow-lg rounded-xl transition-all text-left group shadow-sm relative"
              >
                <button
                  type="button"
                  onClick={(e) => handleDeleteTemplate(e, template.id)}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete template"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">
                  📅
                </span>
                <p className="font-semibold text-gray-900">{template.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {template.config.duration}min · {template.config.searchWindowDays} days
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Built-in Quick Options */}
      <div className="space-y-2">
        {hasUserTemplates && (
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quick Options</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectSlots(option.generator())}
              className="p-5 bg-white border-2 border-white hover:border-indigo-300 hover:shadow-lg rounded-xl transition-all text-left group shadow-sm"
            >
              <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">
                {option.icon}
              </span>
              <p className="font-semibold text-gray-900">{option.title}</p>
              <p className="text-sm text-gray-500 mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {templatesLoading && (
        <p className="text-xs text-slate-400 text-center">Loading templates...</p>
      )}
    </div>
  );
}

export default QuickScheduleButtons;
