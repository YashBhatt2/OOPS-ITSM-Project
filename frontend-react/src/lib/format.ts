/**
 * Date, time, and numeral formatting utilities following DESIGN.md §12
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
 * Returns hours, minutes, seconds and whether seconds should be dimmed (DESIGN.md §5.3)
 */
export function formatDurationParts(seconds: number): {
  primary: string;
  dimmed: string;
  isOverdue: boolean;
} {
  const isOverdue = seconds < 0;
  const abs = Math.abs(seconds);

  const hrs = Math.floor(abs / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  const secs = Math.floor(abs % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return {
      primary: `${pad(hrs)}:${pad(mins)}:`,
      dimmed: pad(secs),
      isOverdue,
    };
  }

  return {
    primary: `${pad(mins)}:`,
    dimmed: pad(secs),
    isOverdue,
  };
}

