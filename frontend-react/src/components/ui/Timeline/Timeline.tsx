import React, { useState, useMemo, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { CaretDown } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/lib/api';
import { PriorityMarker } from '../PriorityMarker/PriorityMarker';
import { Button } from '../Button/Button';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { useScrollEdges } from '@/lib/useScrollEdges';
import {
  RawHistoryEvent,
  HistoryFilterCategory,
  HistoryResolutionContext,
  humanizeHistoryItem,
  groupConsecutiveSlaEvents,
  groupItemsByDay,
  formatSinceReport,
  formatEntryTime,
  formatFullTooltip,
} from '@/features/incident/historyMap';
import styles from './Timeline.module.css';

export interface TimelineProps {
  incidentId?: string;
  cycleStartIso?: string;
  incidentCycleNumber?: number;
  entries?: RawHistoryEvent[];
  items?: RawHistoryEvent[];
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  incidentId,
  cycleStartIso,
  entries,
  items,
  isLoading: propLoading,
  isError: propError,
  error: propErrorObj,
  onRetry,
  className,
}) => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<HistoryFilterCategory>('All');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const prevTopIdRef = useRef<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const { moreAfter } = useScrollEdges(viewportRef, 'vertical');
  const [hiddenCount, setHiddenCount] = useState<number>(0);

  const handleScrollPageDown = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollBy({
        top: viewportRef.current.clientHeight * 0.75,
        behavior: 'smooth',
      });
    }
  };

  // 1. Fetch history if incidentId provided and no explicit entries
  const queryResult = useQuery<RawHistoryEvent[]>({
    queryKey: ['incident-history', incidentId],
    queryFn: () => apiRequest(`/api/v1/incidents/${incidentId}/history`),
    enabled: Boolean(incidentId && !entries && !items),
  });

  const rawList: RawHistoryEvent[] = entries || items || queryResult.data || [];
  const isLoading = propLoading ?? (Boolean(incidentId && !entries && !items) && queryResult.isLoading);
  const isError = propError ?? queryResult.isError;
  const errorObj = propErrorObj ?? queryResult.error;

  // 2. Fetch technicians for Admin name resolution
  const { data: technicians = [] } = useQuery<{ id: string; displayName?: string; name?: string }[]>({
    queryKey: ['admin-technicians'],
    queryFn: () => apiRequest('/api/v1/admin/technicians'),
    enabled: user?.role === 'ADMIN',
  });

  // 3. Fetch services and categories for resolving classification changes
  const { data: services = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['services'],
    queryFn: () => apiRequest('/api/v1/services'),
  });

  const { data: categories = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['categories'],
    queryFn: () => apiRequest('/api/v1/categories'),
  });

  const resolutionContext: HistoryResolutionContext = useMemo(() => {
    const techMap = new Map<string, { displayName?: string; name?: string }>();
    for (const t of technicians) {
      techMap.set(t.id, t);
    }
    const servMap = new Map<string, string>();
    for (const s of services) {
      servMap.set(s.id, s.name);
    }
    const catMap = new Map<string, string>();
    for (const c of categories) {
      catMap.set(c.id, c.name);
    }

    return {
      currentUserId: user?.id,
      userRole: user?.role,
      techniciansMap: techMap,
      servicesMap: servMap,
      categoriesMap: catMap,
    };
  }, [technicians, services, categories, user]);

  // Determine earliest event for "since report" calculation
  const calculatedCycleStart = useMemo(() => {
    if (cycleStartIso) return cycleStartIso;
    if (rawList.length === 0) return new Date().toISOString();
    // Raw list from backend is in ascending order
    return rawList[0].createdAt || new Date().toISOString();
  }, [cycleStartIso, rawList]);

  // Process, humanize, group SLA, and sort newest first
  const processedItems = useMemo(() => {
    if (!rawList || rawList.length === 0) return [];

    // Map each raw item
    const humanized = rawList.map((entry) => humanizeHistoryItem(entry, resolutionContext));

    // Sort newest first
    const newestFirst = [...humanized].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Group consecutive SLA events
    return groupConsecutiveSlaEvents(newestFirst);
  }, [rawList, resolutionContext]);

  // Track new top entry animation after action refetch
  useEffect(() => {
    if (processedItems.length > 0) {
      setHasLoadedOnce(true);
      prevTopIdRef.current = processedItems[0].id;
    }
  }, [processedItems]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Filter items
  const filteredItems = useMemo(() => {
    if (activeFilter === 'All') return processedItems;
    return processedItems.filter((item) => item.filterCategory === activeFilter);
  }, [processedItems, activeFilter]);

  // Group by day for visual separation
  const dayGroups = useMemo(() => {
    return groupItemsByDay(filteredItems);
  }, [filteredItems]);

  // Track hidden count of items below fold
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const updateCount = () => {
      if (!moreAfter) {
        setHiddenCount(0);
        return;
      }
      const itemEls = el.querySelectorAll(`.${styles.timelineItem}`);
      const bottomCutoff = el.scrollTop + el.clientHeight - 24;
      let count = 0;
      itemEls.forEach((item) => {
        const htmlItem = item as HTMLElement;
        if (htmlItem.offsetTop > bottomCutoff) {
          count++;
        }
      });
      setHiddenCount(Math.max(1, count));
    };

    updateCount();
    el.addEventListener('scroll', updateCount, { passive: true });
    window.addEventListener('resize', updateCount);
    return () => {
      el.removeEventListener('scroll', updateCount);
      window.removeEventListener('resize', updateCount);
    };
  }, [moreAfter, filteredItems]);

  // Handle Loading Skeleton (4 rows)
  if (isLoading) {
    return (
      <div className={clsx(styles.timelineWrapper, className)}>
        <div className={styles.eyebrow}>
          <span>Lifecycle history</span>
        </div>
        <div className={styles.skeletonContainer} aria-busy="true" aria-label="Loading history">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={styles.skeletonNode} />
              <div className={styles.skeletonTextCol}>
                <div className={styles.skeletonBarTitle} />
                <div className={styles.skeletonBarSub} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle Error State
  if (isError) {
    const requestId =
      errorObj && typeof errorObj === 'object' && 'requestId' in errorObj
        ? (errorObj as { requestId?: string }).requestId
        : null;

    return (
      <div className={clsx(styles.timelineWrapper, className)}>
        <div className={styles.eyebrow}>
          <span>Lifecycle history</span>
        </div>
        <div className={styles.errorState}>
          <p className={styles.errorMessage}>Failed to load lifecycle history.</p>
          {requestId && <p className={styles.requestId}>Request ID: {requestId}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              variant="secondary"
              size="compact"
              onClick={() => {
                if (onRetry) onRetry();
                else queryResult.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Empty State
  if (processedItems.length === 0) {
    return (
      <div className={clsx(styles.timelineWrapper, className)}>
        <div className={styles.eyebrow}>
          <span>Lifecycle history</span>
        </div>
        <p className={styles.emptyState}>No history yet.</p>
      </div>
    );
  }

  const isEmployee = user?.role === 'EMPLOYEE';
  const showFilters = !isEmployee && processedItems.length > 6;

  // Flatten items for connector line logic
  const allFilteredItems = filteredItems;
  const totalItemCount = allFilteredItems.length;

  return (
    <div className={clsx(styles.timelineWrapper, className)}>
      <div className={styles.eyebrow}>
        <span>Lifecycle history</span>
      </div>

      {/* Filter chips (only for staff when > 6 entries) */}
      {showFilters && (
        <div className={styles.filterRow} role="tablist" aria-label="Filter lifecycle history">
          {(['All', 'Workflow', 'SLA', 'Comments'] as HistoryFilterCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeFilter === cat}
              className={clsx(styles.filterChip, activeFilter === cat && styles.activeFilterChip)}
              onClick={() => setActiveFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Internal scrollable list with blur edge cues via ScrollArea */}
      <div style={{ position: 'relative' }}>
        <ScrollArea
          type="scroll"
          edgeMode="blur"
          orientation="vertical"
          ariaLabel="Lifecycle history"
          viewportRef={viewportRef}
          className={styles.scrollContainer}
        >
          {dayGroups.map((group) => (
            <section key={group.dayLabel} className={styles.dayGroup} aria-label={`History from ${group.dayLabel}`}>
              <div className={styles.dayLabel}>{group.dayLabel}</div>

              <ol className={styles.timelineList}>
                {group.items.map((item) => {
                  // Find global index among all filtered items
                  const globalIdx = allFilteredItems.findIndex((it) => it.id === item.id);
                  const isVeryFirstOverall = globalIdx === 0;
                  const isVeryLastOverall = globalIdx === totalItemCount - 1;

                  // Motion stagger delay on initial load (max 6 items)
                  const staggerDelay = !hasLoadedOnce && globalIdx < 6 ? globalIdx * 0.04 : 0;

                  // Tone & node styling
                  const isViolation = item.isViolation;
                  let nodeStyle = styles.nodeNeutral;
                  if (isVeryFirstOverall && item.tone === 'neutral') {
                    nodeStyle = styles.nodeNewest;
                  } else if (item.tone === 'warning') {
                    nodeStyle = styles.nodeWarning;
                  } else if (item.tone === 'critical') {
                    nodeStyle = styles.nodeCritical;
                  }

                  const GlyphComponent = item.glyph;
                  const { numeral, tail } = formatSinceReport(item.createdAt, calculatedCycleStart);
                  const isGroupExpanded = expandedGroups.has(item.id);

                  // Detect cycle change from next item in sequence
                  const nextItem = globalIdx < totalItemCount - 1 ? allFilteredItems[globalIdx + 1] : null;
                  const showCycleDivider =
                    item.cycleId && nextItem?.cycleId && item.cycleId !== nextItem.cycleId;

                  return (
                    <React.Fragment key={item.id}>
                      <li
                        className={styles.timelineItem}
                        style={{
                          animationDelay: `${staggerDelay}s`,
                          transitionDelay: `${staggerDelay}s`,
                        }}
                      >
                        {/* Node Column with Hairline Connector */}
                        <div className={styles.nodeCol}>
                          <div
                            className={clsx(
                              styles.nodeRing,
                              nodeStyle,
                              isViolation && styles.nodeViolationPulse
                            )}
                            aria-hidden="true"
                          >
                            <GlyphComponent size={12} weight="light" />
                          </div>

                          {/* Hairline connector drawn ONLY from first node to last node */}
                          {!isVeryLastOverall && (
                            <div className={styles.connectorLine} aria-hidden="true" />
                          )}
                        </div>

                        {/* Item Content Column */}
                        <div className={styles.itemContent}>
                          <div className={styles.itemHeader}>
                            {item.isGroupSummary ? (
                              <button
                                type="button"
                                className={styles.slaGroupButton}
                                onClick={() => toggleGroup(item.id)}
                                aria-expanded={isGroupExpanded}
                                aria-label={`${item.title}, toggle details`}
                              >
                                <span className={styles.itemTitle}>{item.title}</span>
                                <CaretDown
                                  size={14}
                                  weight="light"
                                  className={clsx(
                                    styles.chevronIcon,
                                    isGroupExpanded && styles.chevronOpen
                                  )}
                                />
                              </button>
                            ) : (
                              <div className={styles.itemTitle}>
                                {item.priorityBefore && item.priorityAfter ? (
                                  <span>
                                    Priority changed{' '}
                                    <PriorityMarker priority={item.priorityBefore} /> to{' '}
                                    <PriorityMarker priority={item.priorityAfter} />
                                  </span>
                                ) : (
                                  <span>{item.title}</span>
                                )}
                                {item.strategyTag && (
                                  <span className={styles.strategyTag}>{item.strategyTag}</span>
                                )}
                              </div>
                            )}

                            {/* Time on right in mono with full tooltip */}
                            <time
                              dateTime={item.createdAt}
                              title={formatFullTooltip(item.createdAt)}
                              className={styles.entryTime}
                            >
                              {formatEntryTime(item.createdAt)}
                            </time>
                          </div>

                          {/* Quoted reason line */}
                          {item.quotedReason && (
                            <p className={styles.quotedReason}>“{item.quotedReason}”</p>
                          )}

                          {/* Optional detail line in body-s text-2 (only when adding info) */}
                          {item.detail && <p className={styles.detailLine}>{item.detail}</p>}

                          {/* Dim mono "+4 h 12 m since report" line */}
                          <div className={styles.sinceReport}>
                            <span className={styles.sinceNumeral}>{numeral}</span>{' '}
                            <span className={styles.sinceTail}>{tail}</span>
                          </div>

                          {/* Grouped SLA Children (Revealed via chevron crossfade) */}
                          {item.isGroupSummary && item.groupedChildren && (
                            <ul
                              className={clsx(
                                styles.groupedChildrenList,
                                isGroupExpanded && styles.groupedChildrenOpen
                              )}
                              aria-label="Grouped SLA event details"
                            >
                              {item.groupedChildren.map((child) => {
                                const ChildGlyph = child.glyph;
                                return (
                                  <li key={child.id} className={styles.groupedChildItem}>
                                    <div className={styles.groupedChildTitle}>
                                      <ChildGlyph
                                        size={12}
                                        weight="light"
                                        color={child.tone === 'critical' ? 'var(--red)' : 'var(--amber-text)'}
                                      />
                                      <span>{child.title}</span>
                                    </div>
                                    <time
                                      dateTime={child.createdAt}
                                      title={formatFullTooltip(child.createdAt)}
                                      className={styles.entryTime}
                                    >
                                      {formatEntryTime(child.createdAt)}
                                    </time>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </li>

                      {/* Cycle divider if crossing service cycles */}
                      {showCycleDivider && (
                        <div className={styles.cycleDivider} aria-label="Reopened cycle divider">
                          <span>Reopened: cycle 2</span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </ol>
            </section>
          ))}
        </ScrollArea>

        {/* Pinned "N more" pill that scrolls down one page and disappears at bottom */}
        {moreAfter && (
          <button
            type="button"
            className={styles.morePill}
            onClick={handleScrollPageDown}
            aria-label={hiddenCount > 0 ? `Scroll to see ${hiddenCount} more events` : 'Scroll down'}
          >
            <span>{hiddenCount > 0 ? `${hiddenCount} more` : 'More'}</span>
            <CaretDown size={12} weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
};
