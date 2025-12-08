import { addDays, setHours, setMinutes, isWeekend, nextMonday, nextWednesday, nextFriday } from 'date-fns';
import type { PrefilledSlot } from '../../pages/SchedulePage';

interface QuickScheduleButtonsProps {
  onSelectSlots: (slots: PrefilledSlot[]) => void;
  meetingDuration: number; // in minutes
}

export function QuickScheduleButtons({ onSelectSlots, meetingDuration }: QuickScheduleButtonsProps) {
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

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Quick Schedule</h3>
        <p className="text-xs text-slate-500">Select a preset to quickly propose meeting times</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickOptions.map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelectSlots(option.generator())}
            className="p-4 bg-white border border-slate-200 hover:border-slate-400 hover:shadow-md rounded-xl transition-all text-left group"
          >
            <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">
              {option.icon}
            </span>
            <p className="font-medium text-slate-700 text-sm">{option.title}</p>
            <p className="text-xs text-slate-500 mt-1">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickScheduleButtons;
