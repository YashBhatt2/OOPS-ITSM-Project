/**
 * Date, time, reference, and duration formatting utilities following DESIGN.md §12
 */

export function formatDate(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  // Format: "November 9, 2026"
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatTime(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  // Format: "10:45 a.m."
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d);

  let hour = '';
  let minute = '';
  let dayPeriod = '';

  for (const part of parts) {
    if (part.type === 'hour') hour = part.value;
    if (part.type === 'minute') minute = part.value;
    if (part.type === 'dayPeriod') {
      dayPeriod = part.value.toLowerCase() === 'pm' ? 'p.m.' : 'a.m.';
    }
  }

  return `${hour}:${minute} ${dayPeriod}`;
}

export function formatDateTime(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return `${formatDate(d)} at ${formatTime(d)}`;
}

export function formatRelativeTime(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHours = Math.round(diffMin / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDate(d);
}

/**
 * Incident reference formatter (INC-000123 style)
 * Converts raw UUIDs or INC-<UUID> strings into deterministic INC-000123 format.
 */
export function formatReference(refOrId?: string | null): string {
  if (!refOrId) return 'INC-000000';
  const str = refOrId.trim();
  // If already standard INC-123456
  if (/^INC-\d{4,6}$/i.test(str)) {
    return str.toUpperCase();
  }
  // If it contains a UUID
  const clean = str.replace(/^INC-/i, '');
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}/i.test(clean)) {
    // Generate deterministic 6-digit reference from hex
    const hexSlice = clean.replace(/-/g, '').slice(0, 8);
    const num = (parseInt(hexSlice, 16) % 900000) + 100000;
    return `INC-${num}`;
  }
  return str.toUpperCase();
}

/**
 * Format overdue duration without exceeding 59 minutes:
 * "8 h overdue", "1 d 3 h overdue", "45 m overdue".
 */
export function formatOverdueDuration(seconds: number): string {
  const absSec = Math.abs(seconds);
  const totalMins = Math.round(absSec / 60);

  if (totalMins < 60) {
    return `${Math.max(1, totalMins)} m`;
  }

  const hours = Math.floor(totalMins / 60);
  const remMins = totalMins % 60;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  if (days > 0) {
    if (remHours > 0) {
      return `${days} d ${remHours} h`;
    }
    return `${days} d`;
  }

  if (remMins > 0) {
    return `${hours} h ${remMins} m`;
  }
  return `${hours} h`;
}

/**
 * Returns hours, minutes, seconds, unit word and whether seconds should be dimmed (DESIGN.md §5.3, §10.14)
 */
export function formatDurationParts(seconds: number): {
  primary: string;
  dimmed: string;
  isOverdue: boolean;
  unitWord: string;
  formattedText: string;
} {
  const isOverdue = seconds < 0;
  const abs = Math.abs(seconds);

  const hrs = Math.floor(abs / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  const secs = Math.floor(abs % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  let primary = '';
  let dimmed = '';

  if (hrs > 0) {
    primary = `${pad(hrs)}:${pad(mins)}:`;
    dimmed = pad(secs);
  } else {
    primary = `${pad(mins)}:`;
    dimmed = pad(secs);
  }

  const unitWord = isOverdue ? 'overdue' : 'left';
  const overdueStr = isOverdue ? formatOverdueDuration(abs) : '';
  const formattedText = isOverdue ? `${overdueStr} overdue` : `${primary}${dimmed} left`;

  return {
    primary,
    dimmed,
    isOverdue,
    unitWord,
    formattedText,
  };
}
