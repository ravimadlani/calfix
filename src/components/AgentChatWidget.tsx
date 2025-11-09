import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CalendarAnalytics,
  CalendarEvent,
  EventWithGap,
  IntentActionHandlers,
  NaturalLanguageMessage
} from '../types';
import { parseNaturalLanguageCommand } from '../services/naturalLanguage';
import { executeIntent } from '../services/calendarExecutor';
import { formatIntentResponse } from '../services/responseFormatter';
import { getUserTimezone } from '../utils/timezoneHelper';

interface AgentChatWidgetProps {
  events: CalendarEvent[];
  extendedEvents?: CalendarEvent[];
  eventsWithGaps?: EventWithGap[];
  analytics?: CalendarAnalytics | null;
  assistantActions?: IntentActionHandlers;
  currentView: string;
  timeRange: { timeMin: string; timeMax: string } | null;
}

const AVAILABLE_INTENTS = [
  'find_availability',
  'check_conflicts',
  'respond_to_request',
  'bulk_action',
  'create_focus_block',
  'multi_timezone_query',
  'suggest_reschedule'
] as const;

const EXAMPLE_PROMPTS = [
  'Show me 30-min slots tomorrow between 9am and 5pm',
  'Can I meet Monday or Tuesday at 2pm EST?',
  'Add 15-minute buffers before my meetings next week'
];

const buildMessage = (partial: Partial<NaturalLanguageMessage>): NaturalLanguageMessage => ({
  id: partial.id ?? `msg-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  role: partial.role ?? 'assistant',
  content: partial.content ?? '',
  timestamp: partial.timestamp ?? new Date().toISOString(),
  status: partial.status ?? 'complete',
  meta: partial.meta ?? {}
});

const AgentChatWidget: React.FC<AgentChatWidgetProps> = ({
  events,
  extendedEvents = [],
  eventsWithGaps = [],
  analytics = null,
  assistantActions,
  currentView,
  timeRange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<NaturalLanguageMessage[]>(() => [
    buildMessage({
      role: 'assistant',
      content: 'Hi! I can help you check availability, spot conflicts, or draft replies. Try asking “Do I have time for a 30-min call tomorrow afternoon?”',
      meta: { system: true }
    })
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const timezone = useMemo(() => getUserTimezone(), []);
  const scrollRef = useRef<HTMLDivElement>(null);

  const combinedEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    const all = [...events, ...extendedEvents];
    all.forEach(event => {
      if (!event) {
        return;
      }
      const key = `${event.id}-${event.start?.dateTime ?? event.start?.date ?? ''}`;
      if (!map.has(key)) {
        map.set(key, event);
      }
    });
    return Array.from(map.values());
  }, [events, extendedEvents]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = useCallback(async () => {
    const command = inputValue.trim();
    if (!command || isProcessing) {
      return;
    }

    const userMessage = buildMessage({ role: 'user', content: command });
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    const context = {
      currentDate: new Date(),
      userTimezone: timezone,
      availableIntents: [...AVAILABLE_INTENTS],
      currentView
    };

    try {
      const parsed = await parseNaturalLanguageCommand(command, context);
      if (!parsed.intent) {
        const assistantMessage = buildMessage({
          role: 'assistant',
          content: parsed.error ?? "I couldn't understand that yet. Try asking about availability or conflicts.",
          meta: { source: parsed.source }
        });
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      const execution = await executeIntent(parsed.intent, {
        events: combinedEvents,
        eventsWithGaps,
        currentDate: new Date(),
        timezone,
        currentView,
        timeRange,
        analytics,
        actions: assistantActions
      });

      const formatted = formatIntentResponse(execution, timezone);
      const assistantMessage = buildMessage({
        role: 'assistant',
        content: formatted.text,
        meta: {
          intent: parsed.intent.type,
          source: parsed.source,
          warnings: execution.warnings,
          status: execution.status,
          executed: execution.meta?.executed,
          appliedCount: execution.meta?.appliedCount
        }
      });
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to process natural language command', error);
      const assistantMessage = buildMessage({
        role: 'assistant',
        content: 'Sorry, something went wrong interpreting that command. Please try again.',
        meta: { error: true }
      });
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [assistantActions, analytics, combinedEvents, currentView, eventsWithGaps, inputValue, isProcessing, timeRange, timezone]);

  const handleExampleClick = useCallback((prompt: string) => {
    setInputValue(prompt);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <>
      <button
        type="button"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300"
        onClick={() => setIsOpen(true)}
        aria-label="Open CalFix assistant"
      >
        🤖
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsOpen(false)} aria-hidden />
          <aside className="relative z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">CalFix Assistant</h2>
                <p className="text-xs text-slate-500">Ask in natural language to manage your calendar</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close assistant"
              >
                ✕
              </button>
            </header>

            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Try asking</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                    onClick={() => handleExampleClick(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-3">
                {messages.map(message => {
                  const sourceLabel = typeof message.meta?.source === 'string' ? message.meta.source : null;
                  return (
                    <div
                      key={message.id}
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        message.role === 'user'
                          ? 'ml-auto bg-indigo-600 text-white'
                          : 'mr-auto bg-slate-100 text-slate-900'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {sourceLabel && (
                        <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">
                          Parsed via {sourceLabel}
                        </p>
                      )}
                    </div>
                  );
                })}
                {isProcessing && (
                  <div className="mr-auto rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
                    Thinking…
                  </div>
                )}
              </div>
            </div>

            <form
              className="border-t border-slate-200 px-5 py-4"
              onSubmit={event => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-indigo-400 focus-within:shadow-md">
                <textarea
                  value={inputValue}
                  onChange={event => setInputValue(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder="Ask CalFix to check availability or handle scheduling…"
                  className="h-24 w-full resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-slate-900 outline-none"
                />
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
                  <span className="text-xs text-slate-400">Press Enter to send • Shift+Enter for new line</span>
                  <button
                    type="submit"
                    disabled={isProcessing || inputValue.trim().length === 0}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isProcessing ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
};

export default AgentChatWidget;
