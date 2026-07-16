import { getIntlLocale, translate } from '../i18n/I18nProvider';

const ISO_OFFSET_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/i;

/**
 * Converts a browser `datetime-local` value (or an already offset-aware value)
 * to the UTC ISO-8601 contract used by the meetup API.
 */
export const localDateTimeToUtcIso = (value?: string | null): string | undefined => {
  if (!value) return undefined;

  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new Error('Invalid meetup date-time');
  }
  return instant.toISOString();
};

/** Parses only the offset-aware values promised by the meetup response API. */
export const parseMeetupDateTime = (value?: string | null): Date | null => {
  if (!value || !ISO_OFFSET_SUFFIX.test(value)) return null;

  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
};

export const formatMeetupDateTime = (value?: string | null): string => {
  const instant = parseMeetupDateTime(value);
  if (!instant) return translate('일정 확인 필요', 'Schedule unavailable');

  return new Intl.DateTimeFormat(getIntlLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(instant);
};

/** Converts an offset-aware API instant into the browser-local datetime input value. */
export const meetupDateTimeToLocalInput = (value?: string | null): string => {
  const instant = parseMeetupDateTime(value);
  if (!instant) return '';

  const pad = (part: number) => String(part).padStart(2, '0');
  return [
    instant.getFullYear(),
    '-',
    pad(instant.getMonth() + 1),
    '-',
    pad(instant.getDate()),
    'T',
    pad(instant.getHours()),
    ':',
    pad(instant.getMinutes()),
  ].join('');
};
