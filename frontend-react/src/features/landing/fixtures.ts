/**
 * Static fixture data representing one real incident followed from report to fix.
 * Conforms strictly to domain rules in docs/phase-1/requirements.md.
 */

import { IncidentStatus, Priority } from '@/lib/constants';

export interface IncidentStageSnapshot {
  status: IncidentStatus;
  statusLabel: string;
  stageName: string;
  stepNumber: string;
  stepTitle: string;
  stepSummary: string;
  reference: string;
  title: string;
  service: string;
  category: string;
  priority: Priority;
  reporter: string;
  assignee: string | null;
  assigneeRole?: string;
  slaRemaining: string; // HH:MM:SS
  slaElapsed: string;
  slaStatus: 'HEALTHY' | 'AT_RISK' | 'BREACHED';
  notes: Array<{
    author: string;
    role: 'Reporter' | 'Technician' | 'Administrator';
    isInternal: boolean;
    text: string;
    time: string;
  }>;
  resolution?: string;
  auditBadge?: string;
}

export const INCIDENT_STORY: IncidentStageSnapshot[] = [
  {
    status: 'NEW',
    statusLabel: 'New',
    stageName: 'Report',
    stepNumber: '01',
    stepTitle: 'Report',
    stepSummary:
      "Describe the problem, pick the service, say how urgent it feels. That's all an employee has to do.",
    reference: 'INC-000123',
    title: 'Primary database replica connection timeout',
    service: 'Database Services',
    category: 'Infrastructure',
    priority: 'P1',
    reporter: 'Aarav Sharma',
    assignee: null,
    slaRemaining: '02:00:00',
    slaElapsed: '00:00:00',
    slaStatus: 'HEALTHY',
    notes: [],
  },
  {
    status: 'ASSIGNED',
    statusLabel: 'Assigned',
    stageName: 'Assign',
    stepNumber: '02',
    stepTitle: 'Assign',
    stepSummary:
      'An administrator confirms the best technician, matched on skills and current workload.',
    reference: 'INC-000123',
    title: 'Primary database replica connection timeout',
    service: 'Database Services',
    category: 'Infrastructure',
    priority: 'P1',
    reporter: 'Aarav Sharma',
    assignee: 'Elena Rostova',
    assigneeRole: 'Database Specialist',
    slaRemaining: '01:54:12',
    slaElapsed: '00:05:48',
    slaStatus: 'HEALTHY',
    notes: [],
    auditBadge: 'Skill-matched (PostgreSQL L5, 2/5 active slots)',
  },
  {
    status: 'ACKNOWLEDGED',
    statusLabel: 'Acknowledged',
    stageName: 'Acknowledge',
    stepNumber: '03',
    stepTitle: 'Acknowledge',
    stepSummary:
      'The technician takes ownership, and the acknowledgment is recorded.',
    reference: 'INC-000123',
    title: 'Primary database replica connection timeout',
    service: 'Database Services',
    category: 'Infrastructure',
    priority: 'P1',
    reporter: 'Aarav Sharma',
    assignee: 'Elena Rostova',
    assigneeRole: 'Database Specialist',
    slaRemaining: '01:48:30',
    slaElapsed: '00:11:30',
    slaStatus: 'HEALTHY',
    notes: [],
    auditBadge: 'Response SLA met in 11m 30s',
  },
  {
    status: 'IN_PROGRESS',
    statusLabel: 'In progress',
    stageName: 'Investigate',
    stepNumber: '04',
    stepTitle: 'Investigate',
    stepSummary:
      'Work happens in the open. Public notes for the reporter, internal notes for the team.',
    reference: 'INC-000123',
    title: 'Primary database replica connection timeout',
    service: 'Database Services',
    category: 'Infrastructure',
    priority: 'P1',
    reporter: 'Aarav Sharma',
    assignee: 'Elena Rostova',
    assigneeRole: 'Database Specialist',
    slaRemaining: '01:22:04',
    slaElapsed: '00:37:56',
    slaStatus: 'HEALTHY',
    notes: [
      {
        author: 'Elena Rostova',
        role: 'Technician',
        isInternal: true,
        text: 'Connection pool on replica-02 exhausted by unindexed analytics query. Hotfix pool size increasing to 250.',
        time: '18m ago',
      },
      {
        author: 'Elena Rostova',
        role: 'Technician',
        isInternal: false,
        text: 'We identified saturated connection poolers on replica-02 and are cycling connections now.',
        time: '12m ago',
      },
    ],
  },
  {
    status: 'RESOLVED',
    statusLabel: 'Resolved',
    stageName: 'Resolve',
    stepNumber: '05',
    stepTitle: 'Resolve',
    stepSummary:
      'The technician records what fixed it, and resolution time is captured automatically.',
    reference: 'INC-000123',
    title: 'Primary database replica connection timeout',
    service: 'Database Services',
    category: 'Infrastructure',
    priority: 'P1',
    reporter: 'Aarav Sharma',
    assignee: 'Elena Rostova',
    assigneeRole: 'Database Specialist',
    slaRemaining: '01:14:10',
    slaElapsed: '00:45:50',
    slaStatus: 'HEALTHY',
    notes: [
      {
        author: 'Elena Rostova',
        role: 'Technician',
        isInternal: false,
        text: 'We identified saturated connection poolers on replica-02 and are cycling connections now.',
        time: '24m ago',
      },
    ],
    resolution:
      'Restarted PgBouncer pooler on replica-02 with max_client_conn=250. P99 query latency normalized to 3.8ms.',
    auditBadge: 'Resolved on time (45m elapsed, target 2h)',
  },
  {
    status: 'VERIFIED',
    statusLabel: 'Verified',
    stageName: 'Verify',
    stepNumber: '06',
    stepTitle: 'Verify',
    stepSummary:
      'The reporter confirms the fix. If it comes back within seven days, they can reopen it.',
    reference: 'INC-000123',
    title: 'Primary database replica connection timeout',
    service: 'Database Services',
    category: 'Infrastructure',
    priority: 'P1',
    reporter: 'Aarav Sharma',
    assignee: 'Elena Rostova',
    assigneeRole: 'Database Specialist',
    slaRemaining: '00:00:00',
    slaElapsed: '00:52:14',
    slaStatus: 'HEALTHY',
    notes: [
      {
        author: 'Aarav Sharma',
        role: 'Reporter',
        isInternal: false,
        text: 'Verified. Replica read connections are responding normally and dashboards are refreshing.',
        time: 'Just now',
      },
    ],
    resolution:
      'Restarted PgBouncer pooler on replica-02 with max_client_conn=250. P99 query latency normalized to 3.8ms.',
    auditBadge: 'Confirmed by reporter • 7-day reopening window active',
  },
];

export const FACTS_STRIP = [
  'Six lifecycle stages',
  'Priority from impact, urgency and criticality',
  'Skill-first assignment with administrator confirmation',
  'Seven-day reopening',
];

export const ROLE_STORIES = [
  {
    id: 'employee',
    title: 'Employee',
    tagline: 'Frictionless reporting',
    description:
      'Report issues in three simple fields. Track live status changes and verify resolutions when complete.',
    vignette: {
      kind: 'employee-stat',
      activeCount: 1,
      lastStatus: 'In progress',
      ref: 'INC-000123',
      label: 'Your open incidents',
    },
  },
  {
    id: 'technician',
    title: 'Technician',
    tagline: 'Focused triage queue',
    description:
      'Work within guaranteed capacity limits. Acknowledge, investigate, and document fixes with continuous SLA visibility.',
    vignette: {
      kind: 'technician-queue',
      assignedCount: 3,
      maxSlots: 5,
      ref: 'INC-000123',
      p1Remaining: '01:22:04',
      status: 'IN_PROGRESS',
    },
  },
  {
    id: 'admin',
    title: 'Administrator',
    tagline: 'Deterministic dispatch',
    description:
      'Review automated skill and workload recommendations before confirming assignments. Maintain complete system oversight.',
    vignette: {
      kind: 'admin-dispatch',
      suggestedTech: 'Elena Rostova',
      matchScore: '98%',
      capacity: '2 of 5 active slots',
      strategy: 'Skill-first routing',
    },
  },
];

