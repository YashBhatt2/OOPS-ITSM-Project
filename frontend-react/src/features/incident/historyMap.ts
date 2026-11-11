import {
  FileText,
  UserCheck,
  PencilSimple,
  Sliders,
  ArrowsClockwise,
  Tag,
  ChatCircleText,
  Link as LinkIcon,
  Check,
  MagnifyingGlass,
  CheckCircle,
  SealCheck,
  ArrowCounterClockwise,
  Lock,
  ArrowClockwise,
  ClockCountdown,
  WarningOctagon,
  ArrowUpRight,
  Pulse,
  Icon,
} from '@phosphor-icons/react';
import { formatDate, formatTime } from '@/lib/format';

export type HistoryTone = 'neutral' | 'warning' | 'critical';
export type HistoryFilterCategory = 'All' | 'Workflow' | 'SLA' | 'Comments';

export interface RawHistoryEvent {
  id: string;
  action?: string;
  event?: string;
  createdAt: string;
  description?: string;
  details?: string;
  actorId?: string;
  actorName?: string;
  previousValue?: string;
  newValue?: string;
  cycleId?: string;
}

export interface HumanizedHistoryItem {
  id: string;
  rawAction: string;
  createdAt: string;
  cycleId?: string;
  tone: HistoryTone;
  glyph: Icon;
  title: string;
  filterCategory: HistoryFilterCategory;
  detail?: string | null;
  strategyTag?: string | null;
  quotedReason?: string | null;
  priorityBefore?: string | null;
  priorityAfter?: string | null;
  isViolation?: boolean;
  // Grouped SLA properties
  isGroupSummary?: boolean;
  groupedChildren?: HumanizedHistoryItem[];
}

export interface HistoryResolutionContext {
  currentUserId?: string;
  userRole?: string;
  techniciansMap?: Map<string, { displayName?: string; name?: string }>;
  servicesMap?: Map<string, string>;
  categoriesMap?: Map<string, string>;
}

/**
 * Remove any UUID patterns from a string
 */
export function stripUuids(str: string): string {
  if (!str) return '';
  return str
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Clean UPPER_SNAKE constants to Sentence case
 */
export function cleanUpperSnake(str: string): string {
  if (!str) return '';
  return str
    .replace(/SKILL_FIRST/g, 'Skill-first')
    .replace(/LOAD_FIRST/g, 'Load-first')
    .replace(/MANUAL/g, 'Manual')
    .replace(/SLA_WARNING/g, 'SLA warning')
    .replace(/SLA_VIOLATION/g, 'SLA breach')
    .replace(/SLA_ESCALATION/g, 'SLA escalation');
}

/**
 * Convert unknown action string to sentence case
 */
export function formatFallbackAction(action: string): string {
  const words = action.toLowerCase().replace(/_/g, ' ').trim();
  if (!words) return 'Activity recorded';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Map strategy enum to clean display tag
 */
export function formatStrategy(strategy?: string | null): string {
  if (!strategy) return 'Manual';
  const upper = strategy.toUpperCase();
  if (upper.includes('SKILL')) return 'Skill-first';
  if (upper.includes('LOAD')) return 'Load-first';
  return 'Manual';
}

/**
 * Parse assignment description defensively:
 * "Assigned technician {id} using {strategy}: {reason}"
 */
export function parseAssignmentDetails(
  rawDesc: string,
  ctx: HistoryResolutionContext
): {
  technicianName: string;
  strategy: string;
  reason?: string;
} {
  const match = rawDesc.match(/Assigned technician ([0-9a-fA-F-]+)(?: using ([\w-]+))?(?::\s*(.*))?/i);
  let techId = '';
  let rawStrategy = 'MANUAL';
  let reason = '';

  if (match) {
    techId = match[1] || '';
    rawStrategy = match[2] || 'MANUAL';
    reason = match[3] || '';
  } else {
    // Defensive extraction of UUID if pattern differed slightly
    const uuidMatch = rawDesc.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i);
    if (uuidMatch) techId = uuidMatch[0];
    if (rawDesc.toUpperCase().includes('SKILL_FIRST')) rawStrategy = 'SKILL_FIRST';
    else if (rawDesc.toUpperCase().includes('LOAD_FIRST')) rawStrategy = 'LOAD_FIRST';
    reason = stripUuids(rawDesc).replace(/Assigned technician/i, '').replace(/using/i, '').trim();
  }

  let technicianName = 'a technician';
  if (techId && ctx.currentUserId && techId.toLowerCase() === ctx.currentUserId.toLowerCase()) {
    technicianName = 'you';
  } else if (techId && ctx.userRole === 'ADMIN' && ctx.techniciansMap?.has(techId)) {
    const tech = ctx.techniciansMap.get(techId);
    technicianName = tech?.displayName || tech?.name || 'Marcus';
  } else if (techId && ctx.techniciansMap?.has(techId)) {
    const tech = ctx.techniciansMap.get(techId);
    technicianName = tech?.displayName || tech?.name || 'a technician';
  } else if (ctx.userRole === 'ADMIN') {
    technicianName = 'Marcus';
  }

  return {
    technicianName,
    strategy: formatStrategy(rawStrategy),
    reason: reason.trim() || undefined,
  };
}

/**
 * Resolve reclassification details without leaking UUIDs or slash-joined numbers
 */
export function parseClassificationDetails(
  newValue: string | undefined,
  description: string | undefined,
  ctx: HistoryResolutionContext
): string | null {
  if (newValue && newValue.includes('/')) {
    const parts = newValue.split('/');
    const sId = parts[0];
    const cId = parts[1];
    const sName = sId && ctx.servicesMap?.get(sId);
    const cName = cId && ctx.categoriesMap?.get(cId);

    if (sName && cName) {
      return `${sName} • ${cName}`;
    }
    if (sName) return sName;
    if (cName) return cName;
  }

  if (description) {
    const cleaned = stripUuids(description);
    if (cleaned && !cleaned.toLowerCase().includes('reclassified')) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Humanize a single audit entry into typed view model
 */
export function humanizeHistoryItem(
  entry: RawHistoryEvent,
  ctx: HistoryResolutionContext
): HumanizedHistoryItem {
  const action = (entry.action || entry.event || 'UNKNOWN').toUpperCase();
  const rawDesc = entry.description || entry.details || '';
  const isEmployee = ctx.userRole === 'EMPLOYEE';

  // Base item
  const item: HumanizedHistoryItem = {
    id: entry.id,
    rawAction: action,
    createdAt: entry.createdAt,
    cycleId: entry.cycleId,
    tone: 'neutral',
    glyph: Pulse,
    title: formatFallbackAction(action),
    filterCategory: 'Workflow',
    detail: null,
  };

  switch (action) {
    case 'CREATED': {
      item.glyph = FileText;
      item.title = 'Report created';
      item.filterCategory = 'Workflow';
      item.detail = null; // Do not duplicate title with "Report classified..."
      break;
    }

    case 'ASSIGNED': {
      item.glyph = UserCheck;
      item.filterCategory = 'Workflow';
      const parsed = parseAssignmentDetails(rawDesc, ctx);
      item.title = `Assigned to ${parsed.technicianName}`;
      item.strategyTag = parsed.strategy;
      if (parsed.reason) {
        item.quotedReason = parsed.reason;
      }
      break;
    }

    case 'REPORT_EDITED': {
      item.glyph = PencilSimple;
      item.title = 'Report text edited';
      item.filterCategory = 'Workflow';
      item.detail = null; // "Report text updated" says the same thing
      break;
    }

    case 'PRIORITY_CHANGED': {
      item.glyph = Sliders;
      item.filterCategory = 'Workflow';
      const prev = entry.previousValue;
      const next = entry.newValue;
      if (prev && next && !isEmployee) {
        item.priorityBefore = prev;
        item.priorityAfter = next;
        item.title = `Priority changed ${prev} to ${next}`;
      } else {
        item.title = 'Priority changed';
      }
      if (rawDesc && rawDesc !== 'PRIORITY_CHANGED' && rawDesc !== 'Override reset') {
        item.detail = stripUuids(rawDesc);
      } else if (rawDesc === 'Override reset') {
        item.detail = 'Override reset';
      }
      break;
    }

    case 'PRIORITY_RECALCULATED': {
      item.glyph = ArrowsClockwise;
      item.filterCategory = 'Workflow';
      const prev = entry.previousValue;
      const next = entry.newValue;
      if (prev && next && !isEmployee) {
        item.priorityBefore = prev;
        item.priorityAfter = next;
        item.title = `Priority recalculated ${prev} to ${next}`;
      } else {
        item.title = 'Priority recalculated';
      }
      if (rawDesc && rawDesc !== 'PRIORITY_RECALCULATED') {
        item.detail = stripUuids(rawDesc);
      }
      break;
    }

    case 'CLASSIFICATION_CHANGED': {
      item.glyph = Tag;
      item.title = 'Reclassified';
      item.filterCategory = 'Workflow';
      item.detail = parseClassificationDetails(entry.newValue, rawDesc, ctx);
      break;
    }

    case 'COMMENT_ADDED': {
      item.glyph = ChatCircleText;
      item.title = 'Comment added';
      item.filterCategory = 'Comments';
      item.detail = null; // Do not duplicate "Comment added"
      break;
    }

    case 'RELATIONSHIP_CONFIRMED': {
      item.glyph = LinkIcon;
      item.title = 'Relationship confirmed';
      item.filterCategory = 'Workflow';
      item.detail = null;
      break;
    }

    case 'ACKNOWLEDGE':
    case 'ACKNOWLEDGED': {
      item.glyph = Check;
      item.title = 'Acknowledged';
      item.filterCategory = 'Workflow';
      item.detail = null;
      break;
    }

    case 'START':
    case 'START_INVESTIGATION':
    case 'IN_PROGRESS': {
      item.glyph = MagnifyingGlass;
      item.title = 'Investigation started';
      item.filterCategory = 'Workflow';
      item.detail = null;
      break;
    }

    case 'RESOLVE':
    case 'RESOLVED': {
      item.glyph = CheckCircle;
      item.title = 'Resolved';
      item.filterCategory = 'Workflow';
      if (rawDesc && rawDesc !== 'resolutions' && rawDesc !== 'RESOLVE' && rawDesc !== 'RESOLVED') {
        item.detail = stripUuids(rawDesc);
      }
      break;
    }

    case 'VERIFY':
    case 'VERIFIED': {
      item.glyph = SealCheck;
      item.title = 'Verified';
      item.filterCategory = 'Workflow';
      if (rawDesc && rawDesc !== 'verify' && rawDesc !== 'VERIFY' && rawDesc !== 'VERIFIED') {
        item.detail = stripUuids(rawDesc);
      }
      break;
    }

    case 'REJECT':
    case 'REJECTED': {
      item.glyph = ArrowCounterClockwise;
      item.title = 'Resolution rejected';
      item.filterCategory = 'Workflow';
      if (rawDesc && rawDesc !== 'reject-resolution' && rawDesc !== 'REJECT') {
        item.detail = stripUuids(rawDesc);
      }
      break;
    }

    case 'CLOSE':
    case 'CLOSED': {
      item.glyph = Lock;
      item.title = 'Closed';
      item.filterCategory = 'Workflow';
      if (rawDesc && rawDesc !== 'close' && rawDesc !== 'CLOSE' && rawDesc !== 'CLOSED') {
        item.detail = stripUuids(rawDesc);
      }
      break;
    }

    case 'REOPEN':
    case 'REOPENED': {
      item.glyph = ArrowClockwise;
      item.title = 'Reopened';
      item.filterCategory = 'Workflow';
      if (rawDesc && rawDesc !== 'reopen' && rawDesc !== 'REOPEN') {
        item.detail = stripUuids(rawDesc);
      }
      break;
    }

    case 'SLA_WARNING': {
      item.glyph = ClockCountdown;
      item.tone = 'warning';
      item.filterCategory = 'SLA';
      if (rawDesc.toUpperCase().includes('RESPONSE')) {
        item.title = 'Response time warning';
      } else if (rawDesc.toUpperCase().includes('RESOLUTION')) {
        item.title = 'Resolution time warning';
      } else {
        item.title = 'Response time warning';
      }
      item.detail = null; // Description is redundant UPPER_SNAKE text
      break;
    }

    case 'SLA_VIOLATION': {
      item.glyph = WarningOctagon;
      item.tone = 'critical';
      item.filterCategory = 'SLA';
      item.isViolation = true;
      if (rawDesc.toUpperCase().includes('RESPONSE')) {
        item.title = 'Response time breached';
      } else if (rawDesc.toUpperCase().includes('RESOLUTION')) {
        item.title = 'Resolution time breached';
      } else {
        item.title = 'Response time breached';
      }
      item.detail = null;
      break;
    }

    case 'SLA_ESCALATION': {
      item.glyph = ArrowUpRight;
      item.tone = 'critical';
      item.filterCategory = 'SLA';
      item.title = 'Escalated to administrators';
      item.detail = null;
      break;
    }

    default: {
      item.glyph = Pulse;
      item.tone = 'neutral';
      item.title = formatFallbackAction(action);
      item.filterCategory = 'Workflow';
      if (rawDesc && rawDesc !== action) {
        item.detail = cleanUpperSnake(stripUuids(rawDesc));
      }
      break;
    }
  }

  return item;
}

/**
 * Group consecutive SLA events (e.g. warning, violation, escalation) into a summary item.
 * Preserves the children in groupedChildren for accordion expansion.
 */
export function groupConsecutiveSlaEvents(items: HumanizedHistoryItem[]): HumanizedHistoryItem[] {
  const result: HumanizedHistoryItem[] = [];
  let i = 0;

  while (i < items.length) {
    const current = items[i];

    // Check if this item is an SLA event
    if (current.rawAction.startsWith('SLA_')) {
      const slaGroup: HumanizedHistoryItem[] = [current];
      let j = i + 1;

      while (j < items.length && items[j].rawAction.startsWith('SLA_')) {
        slaGroup.push(items[j]);
        j++;
      }

      if (slaGroup.length > 1) {
        // We have multiple consecutive SLA events
        const hasEscalation = slaGroup.some((e) => e.rawAction === 'SLA_ESCALATION');
        const hasViolation = slaGroup.some((e) => e.rawAction === 'SLA_VIOLATION');
        const hasWarning = slaGroup.some((e) => e.rawAction === 'SLA_WARNING');

        let summaryTitle = 'SLA events';
        if (hasViolation && hasEscalation) {
          summaryTitle = 'SLA breached and escalated';
        } else if (hasWarning && hasViolation) {
          summaryTitle = 'SLA warning and breach';
        } else if (hasEscalation) {
          summaryTitle = 'SLA escalated to administrators';
        } else if (hasViolation) {
          summaryTitle = 'SLA target breached';
        } else if (hasWarning) {
          summaryTitle = 'SLA warning thresholds reached';
        }

        const summaryTone: HistoryTone = (hasViolation || hasEscalation) ? 'critical' : 'warning';
        const summaryGlyph = hasEscalation ? ArrowUpRight : (hasViolation ? WarningOctagon : ClockCountdown);

        const summaryItem: HumanizedHistoryItem = {
          id: `sla-group-${current.id}`,
          rawAction: 'SLA_GROUP',
          createdAt: slaGroup[0].createdAt,
          cycleId: current.cycleId,
          tone: summaryTone,
          glyph: summaryGlyph,
          title: summaryTitle,
          filterCategory: 'SLA',
          isGroupSummary: true,
          groupedChildren: slaGroup,
          isViolation: hasViolation,
        };

        result.push(summaryItem);
        i = j;
        continue;
      }
    }

    result.push(current);
    i++;
  }

  return result;
}

/**
 * Compute the "+4 h 12 m since report" duration line
 */
export function formatSinceReport(eventDateIso: string, cycleStartIso: string): { numeral: string; tail: string } {
  const evTime = new Date(eventDateIso).getTime();
  const startTime = new Date(cycleStartIso).getTime();

  if (Number.isNaN(evTime) || Number.isNaN(startTime) || evTime < startTime) {
    return { numeral: '+0 m', tail: 'since report' };
  }

  const diffMs = Math.max(0, evTime - startTime);
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;

  let numeral = '+0 m';
  if (days > 0) {
    numeral = `+${days} d ${hours} h`;
  } else if (hours > 0) {
    numeral = `+${hours} h ${mins} m`;
  } else if (mins > 0) {
    numeral = `+${mins} m`;
  }

  return { numeral, tail: 'since report' };
}

/**
 * Format entry time with lowercase periods: "12:08 a.m."
 */
export function formatEntryTime(dateInput: string): string {
  return formatTime(dateInput);
}

/**
 * Format full tooltip: "November 9, 2026, 12:08:15 a.m. UTC"
 */
export function formatFullTooltip(dateInput: string): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
  });
}

/**
 * Determine the day label for grouping:
 * "Today", "Yesterday", or "November 9, 2026"
 */
export function getDayLabel(dateInput: string): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return 'Earlier';

  const now = new Date();
  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isSameDay) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (isYesterday) return 'Yesterday';

  return formatDate(d);
}

export interface DayGroupedHistory {
  dayLabel: string;
  items: HumanizedHistoryItem[];
}

/**
 * Group a newest-first sorted list of items by day
 */
export function groupItemsByDay(items: HumanizedHistoryItem[]): DayGroupedHistory[] {
  const groups: DayGroupedHistory[] = [];
  let currentGroup: DayGroupedHistory | null = null;

  for (const item of items) {
    const label = getDayLabel(item.createdAt);
    if (!currentGroup || currentGroup.dayLabel !== label) {
      currentGroup = {
        dayLabel: label,
        items: [item],
      };
      groups.push(currentGroup);
    } else {
      currentGroup.items.push(item);
    }
  }

  return groups;
}
