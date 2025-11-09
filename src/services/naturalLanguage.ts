import type { Intent, IntentParameters, NaturalLanguageContext, ParsedIntentResult, ProposedTime } from '../types';
import { parseIntentFallback } from './intentParser';

const SYSTEM_PROMPT = `You are a calendar command parser. Convert natural language into structured intents.

Available functions:
- find_availability(duration, date_range, timezone_constraints)
- check_conflicts(proposed_times, duration)
- respond_to_request(proposed_times, duration)
- bulk_action(action_type, filters, preview_mode)
- create_focus_block(duration, target_day)
- multi_timezone_query(duration, timezone_constraints)
- suggest_reschedule(duration, date_range)

Context provided:
- Current date/time: {current_datetime}
- User timezone: {user_timezone}
- Current view: {current_view}

CRITICAL: You will NEVER receive calendar event data. Only parse the command.
`;

const AVAILABLE_FUNCTIONS = [
  {
    name: 'find_availability',
    description: 'Find free time slots in the user\'s calendar',
    parameters: {
      type: 'object',
      properties: {
        duration: {
          type: 'integer',
          description: 'Meeting duration in minutes'
        },
        date_range: {
          type: 'string',
          enum: ['today', 'tomorrow', 'this_week', 'next_week', 'this_month', 'next_month', 'custom'],
          description: 'Time period to search'
        },
        custom_dates: {
          type: 'array',
          items: { type: 'string', format: 'date' },
          description: 'Specific dates if date_range is custom'
        },
        timezone_constraints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timezone: { type: 'string' },
              hours_start: { type: 'number' },
              hours_end: { type: 'number' }
            }
          }
        }
      },
      required: []
    }
  },
  {
    name: 'check_conflicts',
    description: 'Check conflicts for proposed times',
    parameters: {
      type: 'object',
      properties: {
        duration: { type: 'integer' },
        proposed_times: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: []
    }
  },
  {
    name: 'respond_to_request',
    description: 'Evaluate proposed meeting times and craft a response',
    parameters: {
      type: 'object',
      properties: {
        duration: { type: 'integer' },
        proposed_times: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: []
    }
  },
  {
    name: 'bulk_action',
    description: 'Perform batch calendar adjustments',
    parameters: {
      type: 'object',
      properties: {
        action_type: { type: 'string' },
        preview_mode: { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'create_focus_block',
    description: 'Suggest an optimal focus block',
    parameters: {
      type: 'object',
      properties: {
        duration: { type: 'integer' },
        target_day: { type: 'string' }
      }
    }
  },
  {
    name: 'multi_timezone_query',
    description: 'Find time slots respecting multiple timezones',
    parameters: {
      type: 'object',
      properties: {
        duration: { type: 'integer' },
        timezone_constraints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timezone: { type: 'string' },
              hours_start: { type: 'number' },
              hours_end: { type: 'number' }
            }
          }
        }
      }
    }
  },
  {
    name: 'suggest_reschedule',
    description: 'Find alternative times to move an event',
    parameters: {
      type: 'object',
      properties: {
        duration: { type: 'integer' },
        date_range: {
          type: 'string',
          enum: ['today', 'tomorrow', 'this_week', 'next_week', 'this_month', 'next_month', 'custom']
        }
      }
    }
  }
];

const mapFunctionToIntent = (name: string): Intent['type'] => {
  switch (name) {
    case 'find_availability':
      return 'find_availability';
    case 'check_conflicts':
      return 'check_conflicts';
    case 'respond_to_request':
      return 'respond_to_request';
    case 'bulk_action':
      return 'bulk_action';
    case 'create_focus_block':
      return 'create_focus_block';
    case 'multi_timezone_query':
      return 'multi_timezone_query';
    case 'suggest_reschedule':
      return 'suggest_reschedule';
    default:
      return 'find_availability';
  }
};

const normalizeParameters = (params: Record<string, unknown>): IntentParameters => {
  const normalized: IntentParameters = {};

  if (typeof params.duration === 'number' && Number.isFinite(params.duration)) {
    normalized.duration = params.duration;
  }

  if (typeof params.date_range === 'string') {
    normalized.date_range = params.date_range as IntentParameters['date_range'];
  }

  if (Array.isArray(params.custom_dates)) {
    normalized.custom_dates = params.custom_dates.filter((value): value is string => typeof value === 'string');
  }

  if (Array.isArray(params.timezone_constraints)) {
    normalized.timezone_constraints = params.timezone_constraints
      .map(item => {
        if (
          item &&
          typeof item === 'object' &&
          typeof (item as Record<string, unknown>).timezone === 'string'
        ) {
          const record = item as Record<string, unknown>;
          return {
            timezone: record.timezone as string,
            label: typeof record.label === 'string' ? (record.label as string) : record.timezone as string,
            hoursStart: typeof record.hours_start === 'number' ? (record.hours_start as number) : 9,
            hoursEnd: typeof record.hours_end === 'number' ? (record.hours_end as number) : 17
          };
        }
        return null;
      })
      .filter((value): value is IntentParameters['timezone_constraints'][number] => Boolean(value));
  }

  if (Array.isArray(params.proposed_times)) {
    normalized.proposed_times = params.proposed_times
      .map(value => {
        if (typeof value === 'string') {
          const proposed: ProposedTime = {
            label: value,
            start: value
          };
          return proposed;
        }
        if (value && typeof value === 'object') {
          const record = value as Record<string, unknown>;
          if (typeof record.start === 'string') {
            const proposed: ProposedTime = {
              label: typeof record.label === 'string' ? (record.label as string) : undefined,
              start: record.start as string,
              end: typeof record.end === 'string' ? (record.end as string) : undefined,
              timezone: typeof record.timezone === 'string' ? (record.timezone as string) : undefined,
              durationMinutes: typeof record.duration === 'number' ? (record.duration as number) : undefined
            };
            return proposed;
          }
        }
        return null;
      })
      .filter((value): value is ProposedTime => Boolean(value));
  }

  if (typeof params.action_type === 'string') {
    normalized.action_type = params.action_type as IntentParameters['action_type'];
  }

  if (typeof params.target_day === 'string') {
    normalized.target_day = params.target_day;
  }

  return normalized;
};

export const parseNaturalLanguageCommand = async (
  command: string,
  context: NaturalLanguageContext
): Promise<ParsedIntentResult> => {
  const trimmed = command.trim();
  if (!trimmed) {
    return {
      intent: null,
      source: 'fallback',
      confidence: 0,
      error: 'Command is empty'
    };
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    return parseIntentFallback(trimmed, context);
  }

  try {
    const body = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
            .replace('{current_datetime}', context.currentDate.toISOString())
            .replace('{user_timezone}', context.userTimezone)
            .replace('{current_view}', context.currentView ?? 'unknown')
        },
        {
          role: 'user',
          content: JSON.stringify({
            command: trimmed,
            context: {
              current_date: context.currentDate.toISOString().split('T')[0],
              user_timezone: context.userTimezone,
              available_intents: context.availableIntents
            }
          })
        }
      ],
      functions: AVAILABLE_FUNCTIONS,
      function_call: 'auto'
    } satisfies Record<string, unknown>;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.warn('OpenAI call failed, using fallback parser', response.status, await response.text());
      return parseIntentFallback(trimmed, context);
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const functionCall = choice?.message?.function_call;

    if (!functionCall || !functionCall.name) {
      console.warn('OpenAI response missing function call, using fallback.');
      return parseIntentFallback(trimmed, context);
    }

    const intentType = mapFunctionToIntent(functionCall.name);
    let parameters: IntentParameters = {};

    if (functionCall.arguments) {
      try {
        const parsedArgs = JSON.parse(functionCall.arguments);
        parameters = normalizeParameters(parsedArgs as Record<string, unknown>);
      } catch (error) {
        console.warn('Failed to parse OpenAI function arguments', error);
      }
    }

    const intent: Intent = {
      type: intentType,
      params: parameters,
      confidence: 0.85,
      rawCommand: trimmed
    };

    return {
      intent,
      source: 'openai',
      confidence: intent.confidence,
      rawResponse: data
    };
  } catch (error) {
    console.warn('OpenAI parser error, using fallback parser', error);
    return parseIntentFallback(trimmed, context);
  }
};
