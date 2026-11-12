/**
 * Greeting header utility and pure calculation logic.
 * Conforms to AGENTS.md and DESIGN.md sections 3, 5, 9, 11.2, 12, and 12.5.
 */

export type TimeBand = 'morning' | 'afternoon' | 'evening' | 'night';

export interface GreetingInfo {
  salutation: string;      // e.g. "Good morning", "Welcome", "Welcome back"
  firstName?: string;       // e.g. "Vatsal"
  timeBand: TimeBand;
  bloomToken: string;       // e.g. "var(--bloom-morning)"
  isReturning7Days: boolean;
  isFirstVisit: boolean;
  fullGreetingText: string; // for document.title and testing
}

export interface SupportingSentence {
  prefix: string;
  linkText?: string;
  linkHref?: string;
  suffix?: string;
  fullText: string;
}

export interface AdminGreetingData {
  breachedCount?: number;
  atRiskCount?: number;
  unassignedNewCount?: number;
  resolutionsWaitingCount?: number;
}

export interface TechnicianGreetingData {
  breachedCount?: number;
  atRiskCount?: number;
  unacknowledgedCount?: number;
  activeWorkload?: number;
  capacity?: number;
}

export interface EmployeeGreetingData {
  resolvedOrVerifiedCount?: number;
  activeIncidentsCount?: number;
}

/**
 * Extract clean first name from displayName.
 * Safely handles null, undefined, empty strings, emails, and punctuation.
 */
export function extractFirstName(displayName?: string | null): string | undefined {
  if (!displayName) return undefined;
  const trimmed = displayName.trim();
  if (!trimmed) return undefined;

  // Split on whitespace or common separator
  const firstWord = trimmed.split(/[\s,]+/)[0];
  // Remove leading/trailing non-alphanumeric chars
  const clean = firstWord.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
  if (!clean) return undefined;

  // Capitalize first letter cleanly if all lowercase
  if (clean === clean.toLowerCase()) {
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean;
}

/**
 * Format weekday and date for eyebrow role, e.g. "Wednesday, November 11".
 */
export function formatGreetingDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Resolve the time band for a given date/time:
 * 05:00 to 11:59 -> morning
 * 12:00 to 16:59 -> afternoon
 * 17:00 to 23:59 -> evening
 * 00:00 to 04:59 -> night ("Welcome back")
 */
export function getTimeBand(date: Date = new Date()): TimeBand {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 17) return 'afternoon';
  if (hours >= 17 && hours < 24) return 'evening';
  return 'night';
}

/**
 * Map time band to corresponding bloom token.
 */
export function getBloomToken(band: TimeBand): string {
  switch (band) {
    case 'morning':
      return 'var(--bloom-morning)';
    case 'afternoon':
      return 'var(--bloom-day)';
    case 'evening':
      return 'var(--bloom-evening)';
    case 'night':
      return 'var(--bloom-night)';
  }
}

/**
 * Pure greeting calculation.
 *
 * @param displayName User's display name or email
 * @param userId Unique user ID for tracking visits in localStorage
 * @param now Current date or mock date
 * @param storage Optional storage interface (defaults to window.localStorage safely)
 */
export function getGreeting(
  displayName?: string | null,
  userId?: string | null,
  now: Date = new Date(),
  storage?: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } | null
): GreetingInfo {
  // Support dev-only clock override stripped in production builds
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined') {
      const devOverride = (window as unknown as { __DEV_GREETING_TIME_OVERRIDE__?: string })
        .__DEV_GREETING_TIME_OVERRIDE__;
      if (devOverride) {
        now = new Date(devOverride);
      }
    }
  }

  const firstName = extractFirstName(displayName);
  const timeBand = getTimeBand(now);
  const bloomToken = getBloomToken(timeBand);

  // Check visit history from storage if available
  let isFirstVisit = false;
  let isReturning7Days = false;

  const storageKey = userId ? `oops_last_visit_${userId}` : 'oops_last_visit_anon';
  let lastVisitIso: string | null = null;

  try {
    const activeStorage = storage !== undefined ? storage : (typeof window !== 'undefined' ? window.localStorage : null);
    if (activeStorage) {
      lastVisitIso = activeStorage.getItem(storageKey);
      if (!lastVisitIso) {
        isFirstVisit = true;
      } else {
        const lastVisitDate = new Date(lastVisitIso);
        if (!isNaN(lastVisitDate.getTime())) {
          const diffMs = now.getTime() - lastVisitDate.getTime();
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
          if (diffMs >= sevenDaysMs) {
            isReturning7Days = true;
          }
        }
      }
    }
  } catch {
    // If storage is unavailable or restricted, fall back silently
  }

  // Determine salutation
  let salutation = 'Good morning';
  if (isFirstVisit) {
    salutation = 'Welcome';
  } else if (isReturning7Days) {
    salutation = 'Welcome back';
  } else {
    switch (timeBand) {
      case 'morning':
        salutation = 'Good morning';
        break;
      case 'afternoon':
        salutation = 'Good afternoon';
        break;
      case 'evening':
        salutation = 'Good evening';
        break;
      case 'night':
        salutation = 'Welcome back';
        break;
    }
  }

  const fullGreetingText = firstName ? `${salutation}, ${firstName}.` : `${salutation}.`;

  return {
    salutation,
    firstName,
    timeBand,
    bloomToken,
    isReturning7Days,
    isFirstVisit,
    fullGreetingText,
  };
}

/**
 * Record visit date in storage after render.
 */
export function recordGreetingVisit(
  userId?: string | null,
  now: Date = new Date(),
  storage?: { setItem: (k: string, v: string) => void } | null
): void {
  const storageKey = userId ? `oops_last_visit_${userId}` : 'oops_last_visit_anon';
  try {
    const activeStorage = storage !== undefined ? storage : (typeof window !== 'undefined' ? window.localStorage : null);
    if (activeStorage) {
      activeStorage.setItem(storageKey, now.toISOString());
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Spell numbers 1 to 9, use numerals for 10 and up.
 */
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export function formatCountWord(n: number, capitalize = false): string {
  if (n >= 1 && n <= 9) {
    const word = NUMBER_WORDS[n];
    return capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  }
  return String(n);
}

/**
 * Construct supporting sentence for Administrator home.
 */
export function getAdminSupportingSentence(data: AdminGreetingData): SupportingSentence {
  const { breachedCount = 0, atRiskCount = 0, unassignedNewCount = 0, resolutionsWaitingCount = 0 } = data;

  if (breachedCount > 0) {
    if (breachedCount === 1) {
      return {
        prefix: 'One incident has ',
        linkText: 'breached its deadline',
        linkHref: '/admin/incidents?slaStatus=BREACHED',
        suffix: '.',
        fullText: 'One incident has breached its deadline.',
      };
    }
    const countWord = breachedCount <= 9 ? formatCountWord(breachedCount, true) : `A total of ${breachedCount}`;
    return {
      prefix: `${countWord} incidents have `,
      linkText: 'breached their deadline',
      linkHref: '/admin/incidents?slaStatus=BREACHED',
      suffix: '.',
      fullText: `${countWord} incidents have breached their deadline.`,
    };
  }

  if (atRiskCount > 0) {
    if (atRiskCount === 1) {
      return {
        prefix: 'One incident is ',
        linkText: 'close to its deadline',
        linkHref: '/admin/incidents?slaStatus=AT_RISK',
        suffix: '.',
        fullText: 'One incident is close to its deadline.',
      };
    }
    const countWord = atRiskCount <= 9 ? formatCountWord(atRiskCount, true) : `A total of ${atRiskCount}`;
    return {
      prefix: `${countWord} incidents are `,
      linkText: 'close to their deadline',
      linkHref: '/admin/incidents?slaStatus=AT_RISK',
      suffix: '.',
      fullText: `${countWord} incidents are close to their deadline.`,
    };
  }

  if (unassignedNewCount > 0) {
    if (unassignedNewCount === 1) {
      return {
        prefix: 'One incident needs an ',
        linkText: 'assignment',
        linkHref: '/admin/incidents?status=NEW',
        suffix: '.',
        fullText: 'One incident needs an assignment.',
      };
    }
    const countWord = unassignedNewCount <= 9 ? formatCountWord(unassignedNewCount, true) : `A total of ${unassignedNewCount}`;
    return {
      prefix: `${countWord} incidents need an `,
      linkText: 'assignment',
      linkHref: '/admin/incidents?status=NEW',
      suffix: '.',
      fullText: `${countWord} incidents need an assignment.`,
    };
  }

  if (resolutionsWaitingCount > 0) {
    if (resolutionsWaitingCount === 1) {
      return {
        prefix: 'One resolution is ',
        linkText: 'waiting for verification',
        linkHref: '/admin/verification',
        suffix: '.',
        fullText: 'One resolution is waiting for verification.',
      };
    }
    const countWord = resolutionsWaitingCount <= 9 ? formatCountWord(resolutionsWaitingCount, true) : `A total of ${resolutionsWaitingCount}`;
    return {
      prefix: `${countWord} resolutions are `,
      linkText: 'waiting for verification',
      linkHref: '/admin/verification',
      suffix: '.',
      fullText: `${countWord} resolutions are waiting for verification.`,
    };
  }

  return {
    prefix: 'Everything is on track.',
    fullText: 'Everything is on track.',
  };
}

/**
 * Construct supporting sentence for Technician home.
 */
export function getTechnicianSupportingSentence(data: TechnicianGreetingData): SupportingSentence {
  const { breachedCount = 0, atRiskCount = 0, unacknowledgedCount = 0, activeWorkload = 0, capacity = 5 } = data;

  if (breachedCount > 0) {
    if (breachedCount === 1) {
      return {
        prefix: 'One of your incidents is ',
        linkText: 'past its deadline',
        linkHref: '/technician/incidents?slaStatus=BREACHED',
        suffix: '.',
        fullText: 'One of your incidents is past its deadline.',
      };
    }
    const countWord = breachedCount <= 9 ? formatCountWord(breachedCount, true) : `A total of ${breachedCount}`;
    return {
      prefix: `${countWord} of your incidents are `,
      linkText: 'past their deadline',
      linkHref: '/technician/incidents?slaStatus=BREACHED',
      suffix: '.',
      fullText: `${countWord} of your incidents are past their deadline.`,
    };
  }

  if (atRiskCount > 0) {
    if (atRiskCount === 1) {
      return {
        prefix: 'One of your incidents is ',
        linkText: 'close to its deadline',
        linkHref: '/technician/incidents?slaStatus=AT_RISK',
        suffix: '.',
        fullText: 'One of your incidents is close to its deadline.',
      };
    }
    const countWord = atRiskCount <= 9 ? formatCountWord(atRiskCount, true) : `A total of ${atRiskCount}`;
    return {
      prefix: `${countWord} of your incidents are `,
      linkText: 'close to their deadline',
      linkHref: '/technician/incidents?slaStatus=AT_RISK',
      suffix: '.',
      fullText: `${countWord} of your incidents are close to their deadline.`,
    };
  }

  if (unacknowledgedCount > 0) {
    if (unacknowledgedCount === 1) {
      return {
        prefix: 'One incident is ',
        linkText: 'waiting for you to acknowledge it',
        linkHref: '/technician?status=ASSIGNED',
        suffix: '.',
        fullText: 'One incident is waiting for you to acknowledge it.',
      };
    }
    const countWord = unacknowledgedCount <= 9 ? formatCountWord(unacknowledgedCount, true) : `A total of ${unacknowledgedCount}`;
    return {
      prefix: `${countWord} incidents are `,
      linkText: 'waiting for you to acknowledge them',
      linkHref: '/technician?status=ASSIGNED',
      suffix: '.',
      fullText: `${countWord} incidents are waiting for you to acknowledge them.`,
    };
  }

  if (activeWorkload > 0) {
    const activeWord = activeWorkload <= 9 ? formatCountWord(activeWorkload, true) : `A total of ${activeWorkload}`;
    const capWord = formatCountWord(capacity, false);
    const verb = activeWorkload === 1 ? 'is' : 'are';
    return {
      prefix: `${activeWord} of your ${capWord} slots `,
      linkText: `${verb} in use`,
      linkHref: '/technician',
      suffix: '.',
      fullText: `${activeWord} of your ${capWord} slots ${verb} in use.`,
    };
  }

  return {
    prefix: 'Your queue is clear.',
    fullText: 'Your queue is clear.',
  };
}

/**
 * Construct supporting sentence for Employee home.
 */
export function getEmployeeSupportingSentence(data: EmployeeGreetingData): SupportingSentence {
  const { resolvedOrVerifiedCount = 0, activeIncidentsCount = 0 } = data;

  if (resolvedOrVerifiedCount > 0) {
    if (resolvedOrVerifiedCount === 1) {
      return {
        prefix: 'One of your incidents ',
        linkText: 'has been resolved',
        linkHref: '/incidents?status=RESOLVED',
        suffix: '.',
        fullText: 'One of your incidents has been resolved.',
      };
    }
    const countWord = resolvedOrVerifiedCount <= 9 ? formatCountWord(resolvedOrVerifiedCount, true) : `A total of ${resolvedOrVerifiedCount}`;
    return {
      prefix: `${countWord} of your incidents `,
      linkText: 'have been resolved',
      linkHref: '/incidents?status=RESOLVED',
      suffix: '.',
      fullText: `${countWord} of your incidents have been resolved.`,
    };
  }

  if (activeIncidentsCount > 0) {
    if (activeIncidentsCount === 1) {
      return {
        prefix: 'You have one ',
        linkText: 'active incident',
        linkHref: '/incidents',
        suffix: '.',
        fullText: 'You have one active incident.',
      };
    }
    const countWord = formatCountWord(activeIncidentsCount, false);
    return {
      prefix: `You have ${countWord} `,
      linkText: 'active incidents',
      linkHref: '/incidents',
      suffix: '.',
      fullText: `You have ${countWord} active incidents.`,
    };
  }

  return {
    prefix: 'Nothing needs your attention.',
    fullText: 'Nothing needs your attention.',
  };
}

