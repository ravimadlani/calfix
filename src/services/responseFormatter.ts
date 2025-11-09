import type { FormattedIntentResponse, IntentExecutionResult } from '../types';
import { formatInTimezone } from '../utils/timezoneHelper';

const formatSlotLine = (slot: NonNullable<IntentExecutionResult['slots']>[number], timezone: string): string => {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const localLabel = formatInTimezone(start, timezone, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
  const endLabel = formatInTimezone(end, timezone, {
    hour: 'numeric',
    minute: '2-digit'
  });
  const secondary = slot.timezoneSummaries
    .filter(summary => summary.timezone !== timezone)
    .map(summary => `${summary.formatted} (${summary.timezone})`);
  const secondaryText = secondary.length > 0 ? ` • ${secondary.join(' / ')}` : '';
  return `• ${localLabel} – ${endLabel}${secondaryText}`;
};

const formatConflictLine = (
  conflict: NonNullable<IntentExecutionResult['conflicts']>[number],
  timezone: string
): string => {
  const start = new Date(conflict.proposed.start);
  const label = formatInTimezone(start, timezone, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
  if (conflict.status === 'free') {
    return `• ✅ ${label} – available`;
  }
  const conflictSummary = conflict.conflictingEvents[0]?.summary ?? 'Busy';
  return `• ❌ ${label} – conflict (${conflictSummary})`;
};

export const formatIntentResponse = (
  result: IntentExecutionResult,
  timezone: string
): FormattedIntentResponse => {
  const sections: string[] = [];
  if (result.status === 'error') {
    sections.push(`⚠️ ${result.title}`);
  } else if (result.meta?.executed) {
    sections.push(`✅ ${result.title}`);
  } else if (result.title) {
    sections.push(result.title);
  }
  sections.push(result.summary);

  if (result.slots && result.slots.length > 0) {
    const slotLines = result.slots.slice(0, 5).map(slot => formatSlotLine(slot, timezone));
    if (result.slots.length > 5) {
      slotLines.push(`• …and ${result.slots.length - 5} more options`);
    }
    sections.push(['Available options:', ...slotLines].join('\n'));
  }

  if (result.conflicts && result.conflicts.length > 0) {
    const conflictLines = result.conflicts.map(conflict => formatConflictLine(conflict, timezone));
    sections.push(['Proposed times:', ...conflictLines].join('\n'));
  }

  if (result.draftResponse) {
    sections.push(`Draft reply:\n${result.draftResponse}`);
  }

  if (result.actionPreview && result.actionPreview.length > 0) {
    const previewLines = result.actionPreview.map(item => {
      const start = new Date(item.originalStart);
      const label = formatInTimezone(start, timezone, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      });
      return `• ${label}: ${item.summary} → ${item.proposedChange}`;
    });
    sections.push(['Action preview:', ...previewLines].join('\n'));
  }

  if (result.suggestions && result.suggestions.length > 0) {
    const suggestions = result.suggestions.map(suggestion => `• ${suggestion}`);
    sections.push(['Next steps:', ...suggestions].join('\n'));
  }

  return {
    text: sections.join('\n\n'),
    details: {
      slots: result.slots,
      conflicts: result.conflicts,
      draftResponse: result.draftResponse,
      actionPreview: result.actionPreview,
      suggestions: result.suggestions
    }
  };
};
