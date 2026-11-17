import { describe, expect, it } from 'vitest';
import { createCommentPayload } from './commentPayload';

describe('comment API payload mapping', () => {
  it('maps a technician public comment to a public NOTE', () => {
    expect(createCommentPayload('  Update received  ', 'COMMENT')).toEqual({
      body: 'Update received',
      kind: 'NOTE',
      visibility: 'PUBLIC',
    });
  });

  it('maps an internal note to a staff-only NOTE', () => {
    expect(createCommentPayload('Checked the logs', 'INTERNAL_NOTE')).toEqual({
      body: 'Checked the logs',
      kind: 'NOTE',
      visibility: 'INTERNAL',
    });
  });

  it('preserves information requests as public requests', () => {
    expect(createCommentPayload('Can you retry?', 'INFORMATION_REQUEST')).toEqual({
      body: 'Can you retry?',
      kind: 'INFORMATION_REQUEST',
      visibility: 'PUBLIC',
    });
  });
});
