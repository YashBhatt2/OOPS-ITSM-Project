import { describe, it, expect } from 'vitest';
import { INCIDENT_STORY, FACTS_STRIP, ROLE_STORIES } from './fixtures';

describe('Landing Page Fixtures and Domain Verification', () => {
  it('has exactly six incident lifecycle stages in proper sequence', () => {
    expect(INCIDENT_STORY).toHaveLength(6);
    expect(INCIDENT_STORY.map((s) => s.status)).toEqual([
      'NEW',
      'ASSIGNED',
      'ACKNOWLEDGED',
      'IN_PROGRESS',
      'RESOLVED',
      'VERIFIED',
    ]);
    expect(INCIDENT_STORY.map((s) => s.stepNumber)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
    ]);
  });

  it('matches required step titles and copy verbatim', () => {
    expect(INCIDENT_STORY[0].stepTitle).toBe('Report');
    expect(INCIDENT_STORY[0].stepSummary).toBe(
      "Describe the problem, pick the service, say how urgent it feels. That's all an employee has to do."
    );

    expect(INCIDENT_STORY[1].stepTitle).toBe('Assign');
    expect(INCIDENT_STORY[1].stepSummary).toBe(
      'An administrator confirms the best technician, matched on skills and current workload.'
    );

    expect(INCIDENT_STORY[2].stepTitle).toBe('Acknowledge');
    expect(INCIDENT_STORY[2].stepSummary).toBe(
      'The technician takes ownership, and the acknowledgment is recorded.'
    );

    expect(INCIDENT_STORY[3].stepTitle).toBe('Investigate');
    expect(INCIDENT_STORY[3].stepSummary).toBe(
      'Work happens in the open. Public notes for the reporter, internal notes for the team.'
    );

    expect(INCIDENT_STORY[4].stepTitle).toBe('Resolve');
    expect(INCIDENT_STORY[4].stepSummary).toBe(
      'The technician records what fixed it, and resolution time is captured automatically.'
    );

    expect(INCIDENT_STORY[5].stepTitle).toBe('Verify');
    expect(INCIDENT_STORY[5].stepSummary).toBe(
      'The reporter confirms the fix. If it comes back within seven days, they can reopen it.'
    );
  });

  it('verifies verified incident reference format and priority rules', () => {
    for (const stage of INCIDENT_STORY) {
      expect(stage.reference).toBe('INC-000123');
      expect(stage.priority).toBe('P1');
      expect(stage.service).toBe('Database Services');
    }
  });

  it('verifies facts strip claims against requirements.md', () => {
    expect(FACTS_STRIP).toEqual([
      'Six lifecycle stages',
      'Priority from impact, urgency and criticality',
      'Skill-first assignment with administrator confirmation',
      'Seven-day reopening',
    ]);
  });

  it('verifies the three distinct role stories', () => {
    expect(ROLE_STORIES).toHaveLength(3);
    const roleIds = ROLE_STORIES.map((r) => r.id);
    expect(roleIds).toEqual(['employee', 'technician', 'admin']);
  });
});

