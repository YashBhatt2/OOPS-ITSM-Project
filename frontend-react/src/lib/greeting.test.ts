import { describe, it, expect } from 'vitest';
import {
  getGreeting,
  extractFirstName,
  formatCountWord,
  getAdminSupportingSentence,
  getTechnicianSupportingSentence,
  getEmployeeSupportingSentence,
} from './greeting';

describe('Greeting Header Logic (getGreeting)', () => {
  const createMockStorage = (initial: Record<string, string> = {}) => {
    const store = { ...initial };
    return {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
  };

  describe('Time band boundaries', () => {
    it('handles 04:59 as night ("Welcome back")', () => {
      const d = new Date('2026-11-11T04:59:00');
      const storage = createMockStorage({ oops_last_visit_user1: new Date('2026-11-10T12:00:00').toISOString() });
      const res = getGreeting('Vatsal Sharma', 'user1', d, storage);
      expect(res.timeBand).toBe('night');
      expect(res.salutation).toBe('Welcome back');
      expect(res.bloomToken).toBe('var(--bloom-night)');
    });

    it('handles 05:00 as morning ("Good morning")', () => {
      const d = new Date('2026-11-11T05:00:00');
      const storage = createMockStorage({ oops_last_visit_user1: new Date('2026-11-10T12:00:00').toISOString() });
      const res = getGreeting('Vatsal Sharma', 'user1', d, storage);
      expect(res.timeBand).toBe('morning');
      expect(res.salutation).toBe('Good morning');
      expect(res.bloomToken).toBe('var(--bloom-morning)');
    });

    it('handles 11:59 as morning ("Good morning")', () => {
      const d = new Date('2026-11-11T11:59:59');
      const storage = createMockStorage({ oops_last_visit_user1: new Date('2026-11-10T12:00:00').toISOString() });
      const res = getGreeting('Vatsal Sharma', 'user1', d, storage);
      expect(res.timeBand).toBe('morning');
      expect(res.salutation).toBe('Good morning');
    });

    it('handles 12:00 as afternoon ("Good afternoon")', () => {
      const d = new Date('2026-11-11T12:00:00');
      const storage = createMockStorage({ oops_last_visit_user1: new Date('2026-11-10T12:00:00').toISOString() });
      const res = getGreeting('Vatsal Sharma', 'user1', d, storage);
      expect(res.timeBand).toBe('afternoon');
      expect(res.salutation).toBe('Good afternoon');
      expect(res.bloomToken).toBe('var(--bloom-day)');
    });

    it('handles 16:59 as afternoon ("Good afternoon")', () => {
      const d = new Date('2026-11-11T16:59:59');
      const storage = createMockStorage({ oops_last_visit_user1: new Date('2026-11-10T12:00:00').toISOString() });
      const res = getGreeting('Vatsal Sharma', 'user1', d, storage);
      expect(res.timeBand).toBe('afternoon');
      expect(res.salutation).toBe('Good afternoon');
    });

    it('handles 17:00 as evening ("Good evening")', () => {
      const d = new Date('2026-11-11T17:00:00');
      const storage = createMockStorage({ oops_last_visit_user1: new Date('2026-11-10T12:00:00').toISOString() });
      const res = getGreeting('Vatsal Sharma', 'user1', d, storage);
      expect(res.timeBand).toBe('evening');
      expect(res.salutation).toBe('Good evening');
      expect(res.bloomToken).toBe('var(--bloom-evening)');
    });

    it('handles 23:59 as evening ("Good evening")', () => {
      const d = new Date('2026-11-11T23:59:59');
      const storage = createMockStorage({ oops_last_visit_user1: new Date('2026-11-10T12:00:00').toISOString() });
      const res = getGreeting('Vatsal Sharma', 'user1', d, storage);
      expect(res.timeBand).toBe('evening');
      expect(res.salutation).toBe('Good evening');
    });

    it('handles 00:00 as night ("Welcome back")', () => {
      const d = new Date('2026-11-11T00:00:00');
      const storage = createMockStorage({ oops_last_visit_user1: new Date('2026-11-10T12:00:00').toISOString() });
      const res = getGreeting('Vatsal Sharma', 'user1', d, storage);
      expect(res.timeBand).toBe('night');
      expect(res.salutation).toBe('Welcome back');
    });
  });

  describe('Visit tracking and storage edge cases', () => {
    it('returns "Welcome, <Name>." on first ever sign-in on this browser', () => {
      const d = new Date('2026-11-11T10:00:00');
      const emptyStorage = createMockStorage({});
      const res = getGreeting('Priya Nair', 'user_new', d, emptyStorage);
      expect(res.isFirstVisit).toBe(true);
      expect(res.salutation).toBe('Welcome');
      expect(res.fullGreetingText).toBe('Welcome, Priya.');
    });

    it('returns "Welcome back, <Name>." when returning after 7 or more days', () => {
      const d = new Date('2026-11-18T10:00:00'); // 7 days after Nov 11
      const storage = createMockStorage({
        oops_last_visit_user2: new Date('2026-11-11T09:00:00').toISOString(),
      });
      const res = getGreeting('Alex Chen', 'user2', d, storage);
      expect(res.isReturning7Days).toBe(true);
      expect(res.salutation).toBe('Welcome back');
      expect(res.fullGreetingText).toBe('Welcome back, Alex.');
    });

    it('returns normal time-of-day greeting when returning within 2 days', () => {
      const d = new Date('2026-11-13T10:00:00');
      const storage = createMockStorage({
        oops_last_visit_user2: new Date('2026-11-11T09:00:00').toISOString(),
      });
      const res = getGreeting('Alex Chen', 'user2', d, storage);
      expect(res.isFirstVisit).toBe(false);
      expect(res.isReturning7Days).toBe(false);
      expect(res.salutation).toBe('Good morning');
      expect(res.fullGreetingText).toBe('Good morning, Alex.');
    });

    it('falls back safely to time-based greeting when storage is unavailable or throws', () => {
      const d = new Date('2026-11-11T14:30:00');
      const faultyStorage = {
        getItem: () => {
          throw new Error('QuotaExceeded or SecurityError');
        },
        setItem: () => {
          throw new Error('QuotaExceeded or SecurityError');
        },
      };
      const res = getGreeting('Sarah Connor', 'user3', d, faultyStorage);
      expect(res.salutation).toBe('Good afternoon');
      expect(res.fullGreetingText).toBe('Good afternoon, Sarah.');
    });
  });

  describe('Name extraction and formatting', () => {
    it('extracts first name from full name', () => {
      expect(extractFirstName('Vatsal Sharma')).toBe('Vatsal');
    });

    it('handles single word name', () => {
      expect(extractFirstName('Marcus')).toBe('Marcus');
    });

    it('handles lowercase name with proper capitalization', () => {
      expect(extractFirstName('priya')).toBe('Priya');
    });

    it('handles hyphenated names', () => {
      expect(extractFirstName('Jean-Luc Picard')).toBe('Jean-Luc');
    });

    it('handles null, empty or whitespace displayName gracefully', () => {
      expect(extractFirstName(null)).toBeUndefined();
      expect(extractFirstName(undefined)).toBeUndefined();
      expect(extractFirstName('')).toBeUndefined();
      expect(extractFirstName('   ')).toBeUndefined();

      const d = new Date('2026-11-11T09:00:00');
      const res = getGreeting('', 'u1', d, createMockStorage({ oops_last_visit_u1: '2026-11-10T00:00:00Z' }));
      expect(res.firstName).toBeUndefined();
      expect(res.fullGreetingText).toBe('Good morning.');
    });
  });

  describe('Number speller (formatCountWord)', () => {
    it('spells out one through nine', () => {
      expect(formatCountWord(1)).toBe('one');
      expect(formatCountWord(1, true)).toBe('One');
      expect(formatCountWord(2)).toBe('two');
      expect(formatCountWord(2, true)).toBe('Two');
      expect(formatCountWord(5)).toBe('five');
      expect(formatCountWord(9)).toBe('nine');
      expect(formatCountWord(9, true)).toBe('Nine');
    });

    it('uses numerals from 10 upwards', () => {
      expect(formatCountWord(10)).toBe('10');
      expect(formatCountWord(25)).toBe('25');
    });
  });

  describe('Admin Supporting Sentence Ladder', () => {
    it('prioritizes breached incidents', () => {
      const res = getAdminSupportingSentence({
        breachedCount: 2,
        atRiskCount: 5,
        unassignedNewCount: 3,
        resolutionsWaitingCount: 1,
      });
      expect(res.fullText).toBe('Two incidents have breached their deadline.');
      expect(res.linkHref).toBe('/admin/incidents?slaStatus=BREACHED');
    });

    it('handles single breached incident with singular grammar', () => {
      const res = getAdminSupportingSentence({
        breachedCount: 1,
      });
      expect(res.fullText).toBe('One incident has breached its deadline.');
    });

    it('avoids starting with a numeral for 10+ breached incidents', () => {
      const res = getAdminSupportingSentence({
        breachedCount: 12,
      });
      expect(res.fullText).toBe('A total of 12 incidents have breached their deadline.');
    });

    it('falls to at-risk incidents when none are breached', () => {
      const res = getAdminSupportingSentence({
        breachedCount: 0,
        atRiskCount: 1,
        unassignedNewCount: 4,
      });
      expect(res.fullText).toBe('One incident is close to its deadline.');
      expect(res.linkHref).toBe('/admin/incidents?slaStatus=AT_RISK');
    });

    it('falls to unassigned NEW incidents when none breached or at risk', () => {
      const res = getAdminSupportingSentence({
        unassignedNewCount: 3,
      });
      expect(res.fullText).toBe('Three incidents need an assignment.');
      expect(res.linkHref).toBe('/admin/incidents?status=NEW');
    });

    it('falls to resolutions waiting verification', () => {
      const res = getAdminSupportingSentence({
        resolutionsWaitingCount: 2,
      });
      expect(res.fullText).toBe('Two resolutions are waiting for verification.');
      expect(res.linkHref).toBe('/admin/verification');
    });

    it('falls to "Everything is on track." when zero active concerns', () => {
      const res = getAdminSupportingSentence({});
      expect(res.fullText).toBe('Everything is on track.');
      expect(res.linkHref).toBeUndefined();
    });
  });

  describe('Technician Supporting Sentence Ladder', () => {
    it('prioritizes breached incidents', () => {
      const res = getTechnicianSupportingSentence({
        breachedCount: 1,
        atRiskCount: 2,
      });
      expect(res.fullText).toBe('One of your incidents is past its deadline.');
      expect(res.linkHref).toBe('/technician/incidents?slaStatus=BREACHED');
    });

    it('handles plural breached incidents', () => {
      const res = getTechnicianSupportingSentence({
        breachedCount: 3,
      });
      expect(res.fullText).toBe('Three of your incidents are past their deadline.');
    });

    it('falls to at-risk incidents', () => {
      const res = getTechnicianSupportingSentence({
        atRiskCount: 1,
      });
      expect(res.fullText).toBe('One of your incidents is close to its deadline.');
      expect(res.linkHref).toBe('/technician/incidents?slaStatus=AT_RISK');
    });

    it('falls to unacknowledged assigned incidents', () => {
      const res = getTechnicianSupportingSentence({
        unacknowledgedCount: 1,
      });
      expect(res.fullText).toBe('One incident is waiting for you to acknowledge it.');
      expect(res.linkHref).toBe('/technician?status=ASSIGNED');
    });

    it('falls to workload slots', () => {
      const res = getTechnicianSupportingSentence({
        activeWorkload: 3,
        capacity: 5,
      });
      expect(res.fullText).toBe('Three of your five slots are in use.');
      expect(res.linkHref).toBe('/technician');
    });

    it('handles singular workload slot', () => {
      const res = getTechnicianSupportingSentence({
        activeWorkload: 1,
        capacity: 5,
      });
      expect(res.fullText).toBe('One of your five slots is in use.');
    });

    it('falls to "Your queue is clear." when empty', () => {
      const res = getTechnicianSupportingSentence({});
      expect(res.fullText).toBe('Your queue is clear.');
      expect(res.linkHref).toBeUndefined();
    });
  });

  describe('Employee Supporting Sentence Ladder', () => {
    it('prioritizes resolved or verified incidents', () => {
      const res = getEmployeeSupportingSentence({
        resolvedOrVerifiedCount: 1,
        activeIncidentsCount: 3,
      });
      expect(res.fullText).toBe('One of your incidents has been resolved.');
      expect(res.linkHref).toBe('/incidents?status=RESOLVED');
    });

    it('handles plural resolved incidents', () => {
      const res = getEmployeeSupportingSentence({
        resolvedOrVerifiedCount: 2,
      });
      expect(res.fullText).toBe('Two of your incidents have been resolved.');
    });

    it('falls to active incidents with singular grammar', () => {
      const res = getEmployeeSupportingSentence({
        activeIncidentsCount: 1,
      });
      expect(res.fullText).toBe('You have one active incident.');
      expect(res.linkHref).toBe('/incidents');
    });

    it('falls to active incidents with plural grammar and spelled numbers', () => {
      const res = getEmployeeSupportingSentence({
        activeIncidentsCount: 2,
      });
      expect(res.fullText).toBe('You have two active incidents.');
    });

    it('falls to active incidents with numerals for 10+', () => {
      const res = getEmployeeSupportingSentence({
        activeIncidentsCount: 14,
      });
      expect(res.fullText).toBe('You have 14 active incidents.');
    });

    it('falls to "Nothing needs your attention." when empty', () => {
      const res = getEmployeeSupportingSentence({});
      expect(res.fullText).toBe('Nothing needs your attention.');
      expect(res.linkHref).toBeUndefined();
    });
  });
});

