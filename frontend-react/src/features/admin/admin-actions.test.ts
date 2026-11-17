import { describe, expect, it } from 'vitest';
import {
  priorityRecalculationAction,
  validateCategoryName,
  validateSkillName,
} from './admin-actions';
import type { Category, Skill } from './types';

const skills: Skill[] = [
  { id: 'skill-1', name: 'Database', active: true },
  { id: 'skill-2', name: 'Network', active: false },
];
const categories: Category[] = [
  { id: 'category-1', name: 'Network', active: true, requirements: {} },
];

describe('admin action validation', () => {
  it('sends the incident version and a trimmed recalculation reason', () => {
    expect(priorityRecalculationAction(7, '  Related reports were reviewed.  ')).toEqual({
      version: 7,
      reason: 'Related reports were reviewed.',
    });
  });

  it('requires a nonblank skill name', () => {
    expect(validateSkillName('   ', skills)).toBe('Skill name is required.');
  });

  it('rejects skill names that duplicate existing names regardless of case', () => {
    expect(validateSkillName(' database ', skills)).toBe('That skill name is already in use.');
  });

  it('allows keeping the selected skill name while editing it', () => {
    expect(validateSkillName('DATABASE', skills, 'skill-1')).toBeUndefined();
  });

  it('rejects renaming a skill to another skill name', () => {
    expect(validateSkillName('Network', skills, 'skill-1')).toBe('That skill name is already in use.');
  });

  it('requires a category name and rejects case-insensitive duplicates', () => {
    expect(validateCategoryName('  ', categories)).toBe('Category name is required.');
    expect(validateCategoryName(' network ', categories)).toBe('That category name is already in use.');
  });

  it('allows keeping the selected category name while editing it', () => {
    expect(validateCategoryName('NETWORK', categories, 'category-1')).toBeUndefined();
  });
});
