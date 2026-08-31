/**
 * Timezone-aware date, time, and currency utilities for BiteBuddy 2.0
 * Default timezone: Asia/Kolkata
 * Global 12-Hour Time Format Standard
 */

export const DEFAULT_TIMEZONE = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || 'Asia/Kolkata';

/**
 * Converts a 24h time string (e.g. '19:00', '00:00', '12:00', '07:30') or Date/ISO string
 * into a standardized 12-hour time format (e.g. '7:00 PM', '12:00 AM', '12:00 PM', '7:30 AM')
 */
export function formatTime12h(
  timeOrDate: string | Date | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (!timeOrDate) return '—';

  // Case 1: Simple 24h time string like "19:00", "07:30", "12:00", "00:00"
  if (typeof timeOrDate === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(timeOrDate.trim())) {
    const [hStr, mStr] = timeOrDate.trim().split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12; // 00:xx is 12:xx AM, 12:xx is 12:xx PM

    const formattedM = String(m).padStart(2, '0');
    return `${h12}:${formattedM} ${period}`;
  }

  // Case 2: Date object or ISO timestamp string
  try {
    const d = typeof timeOrDate === 'string' ? new Date(timeOrDate) : timeOrDate;
    if (isNaN(d.getTime())) return String(timeOrDate);

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(d);
  } catch {
    return String(timeOrDate);
  }
}

/**
 * Returns formatted cutoff display string, e.g. "7:00 PM"
 */
export function formatCutoffDisplay(
  cutoffTime24h: string = '19:00',
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatTime12h(cutoffTime24h, timezone);
}

/**
 * Formats full date and 12-hour time in office timezone, e.g. "1 Sep 2026, 7:00 PM"
 */
export function formatDateTime12h(
  dateOrIso: string | Date | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (!dateOrIso) return '—';
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return String(dateOrIso);

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: timezone,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(d);
  } catch {
    return String(dateOrIso);
  }
}

/**
 * Formats administrative audit trail timestamps:
 * Examples: "Today · 6:42 PM", "Yesterday · 7:15 PM", "31 Aug · 6:42 PM"
 */
export function formatAuditTimestamp(
  dateOrIso: string | Date | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (!dateOrIso) return '—';
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    if (isNaN(d.getTime())) return String(dateOrIso);

    // Get date parts in office timezone
    const nowFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = nowFormatter.format(new Date());
    const eventDateStr = nowFormatter.format(d);

    const time12h = formatTime12h(d, timezone);

    if (eventDateStr === todayStr) {
      return `Today · ${time12h}`;
    }

    // Check if yesterday
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = nowFormatter.format(yesterday);
    if (eventDateStr === yesterdayStr) {
      return `Yesterday · ${time12h}`;
    }

    const dateFormatted = d.toLocaleDateString('en-IN', {
      timeZone: timezone,
      day: 'numeric',
      month: 'short',
    });

    return `${dateFormatted} · ${time12h}`;
  } catch {
    return String(dateOrIso);
  }
}

/**
 * Returns current date string 'YYYY-MM-DD' in specified office timezone
 */
export function getOfficeCurrentDate(timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Returns tomorrow's date string 'YYYY-MM-DD' in specified office timezone
 */
export function getOfficeTomorrowDate(timezone: string = DEFAULT_TIMEZONE): string {
  const now = new Date();
  // Safe 24-hour advance
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(tomorrow);
}

/**
 * Returns current time string 'HH:MM' in specified timezone (24h internal)
 */
export function getOfficeCurrentTime(timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(new Date());
}

/**
 * Computes exact countdown to cutoff time today in office timezone
 */
export function getCutoffCountdown(
  cutoffTime: string = '19:00',
  timezone: string = DEFAULT_TIMEZONE
): {
  minutesLeft: number;
  secondsLeft: number;
  isPassed: boolean;
  urgency: 'normal' | 'warning' | 'urgent' | 'closed';
  formatted: string;
  formattedCutoff: string;
} {
  const formattedCutoff = formatCutoffDisplay(cutoffTime, timezone);
  try {
    const [cutoffH, cutoffM] = cutoffTime.split(':').map(Number);
    const now = new Date();

    // Get current parts in timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const partMap: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        partMap[p.type] = parseInt(p.value, 10);
      }
    }

    const currentH = partMap.hour || 0;
    const currentM = partMap.minute || 0;
    const currentS = partMap.second || 0;

    const currentTotalSec = currentH * 3600 + currentM * 60 + currentS;
    const cutoffTotalSec = cutoffH * 3600 + cutoffM * 60;

    const diffSec = cutoffTotalSec - currentTotalSec;

    if (diffSec <= 0) {
      return {
        minutesLeft: 0,
        secondsLeft: 0,
        isPassed: true,
        urgency: 'closed',
        formatted: 'Closed',
        formattedCutoff,
      };
    }

    const minutesLeft = Math.floor(diffSec / 60);
    const secondsLeft = diffSec % 60;

    let urgency: 'normal' | 'warning' | 'urgent' | 'closed' = 'normal';
    if (minutesLeft <= 5) {
      urgency = 'urgent';
    } else if (minutesLeft <= 30) {
      urgency = 'warning';
    }

    const formattedMinutes = String(minutesLeft).padStart(2, '0');
    const formattedSeconds = String(secondsLeft).padStart(2, '0');

    return {
      minutesLeft,
      secondsLeft,
      isPassed: false,
      urgency,
      formatted: `${formattedMinutes}:${formattedSeconds}`,
      formattedCutoff,
    };
  } catch {
    return {
      minutesLeft: 0,
      secondsLeft: 0,
      isPassed: false,
      urgency: 'normal',
      formatted: cutoffTime,
      formattedCutoff,
    };
  }
}

/**
 * Checks if a given date string 'YYYY-MM-DD' falls on an active working day
 * workingDays: array of numbers [0=Sun, 1=Mon, ..., 6=Sat]
 */
export function isWorkingDay(dateStr: string, workingDays: number[] = [1, 2, 3, 4, 5]): boolean {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  return workingDays.includes(day);
}

/**
 * Computes week boundaries (start and end date strings)
 * weekStartDay: 0=Sunday, 1=Monday
 */
export function getWeekBoundaries(
  dateStr: string,
  weekStartDay: number = 1
): { start: string; end: string } {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  const diff = (day - weekStartDay + 7) % 7;

  const startDate = new Date(d);
  startDate.setUTCDate(d.getUTCDate() - diff);

  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
}

/**
 * Computes month boundaries (start and end date strings)
 */
export function getMonthBoundaries(
  year: number,
  month: number // 1-12
): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/**
 * Formats a date string 'YYYY-MM-DD' into human readable format, e.g. "Mon, 31 Aug"
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats full date with year, e.g. "31 August 2026"
 */
export function formatFullDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats Indian Rupee currency amount, e.g. "₹80" or "₹1,840"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
