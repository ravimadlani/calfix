export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Unable to determine user timezone, defaulting to UTC', error);
    return 'UTC';
  }
};

export const formatInTimezone = (
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
    ...options
  }).format(date);
};

export const getTimePartsInTimezone = (
  date: Date,
  timezone: string
): { hour: number; minute: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  const hour = Number.parseInt(parts.find(part => part.type === 'hour')?.value ?? '0', 10);
  const minute = Number.parseInt(parts.find(part => part.type === 'minute')?.value ?? '0', 10);

  return { hour, minute };
};

export const toDateInTimezone = (date: Date, timezone: string): Date => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return new Date(
    `${lookup.year}-${lookup.month}-${lookup.day}T${lookup.hour}:${lookup.minute}:${lookup.second ?? '00'}`
  );
};

export const describeTimezone = (timezone: string): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    const sample = formatter.format(new Date());
    const tzName = sample.split(' ').pop();
    return tzName || timezone;
  } catch (error) {
    console.warn('Unable to format timezone name', timezone, error);
    return timezone;
  }
};
