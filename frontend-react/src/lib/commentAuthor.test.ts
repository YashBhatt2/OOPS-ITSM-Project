import { describe, expect, it } from 'vitest';
import { commentAuthor } from './commentAuthor';

const incident = { reporterId: 'employee', assignedTechnicianId: 'technician' };
const currentUser = { id: 'technician', displayName: 'Marcus Vance' };

describe('comment authors', () => {
  it('shows the current user’s name for their own comments', () => {
    expect(commentAuthor({ authorId: 'technician' }, incident, currentUser)).toBe('Marcus Vance');
  });

  it('uses names from the administrator’s user list', () => {
    expect(commentAuthor({ authorId: 'employee' }, incident, currentUser, [
      { id: 'employee', displayName: 'Sarah Chen' },
    ])).toBe('Sarah Chen');
  });

  it('uses known incident roles when a name is unavailable', () => {
    expect(commentAuthor({ authorId: 'employee' }, incident, currentUser)).toBe('Employee');
    expect(commentAuthor({ authorId: 'technician' }, incident, null)).toBe('Technician');
  });

  it('does not guess the role of an unknown author', () => {
    expect(commentAuthor({ authorId: 'other' }, incident, currentUser)).toBe('Team member');
    expect(commentAuthor({}, {}, null)).toBe('Team member');
  });
});
