import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, X } from '@phosphor-icons/react';
import { apiRequest } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import { PriorityMarker } from '../PriorityMarker/PriorityMarker';
import { Priority } from '@/lib/constants';
import styles from './Island.module.css';

export interface NotificationItem {
  id: string;
  incidentId?: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  emailDelivered?: boolean;
}

export interface PagedNotifications {
  items: NotificationItem[];
  totalElements: number;
}

interface IncidentPeekData {
  priority?: Priority;
  slaStatus?: string;
}

export const Island: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [peekNotification, setPeekNotification] = useState<NotificationItem | null>(null);
  const [peekMoreCount, setPeekMoreCount] = useState(0);
  const [peekIncident, setPeekIncident] = useState<IncidentPeekData | null>(null);
  const [hasBreachPulse, setHasBreachPulse] = useState(false);

  // Track seen IDs across sessions
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveredRef = useRef(false);
  const restButtonRef = useRef<HTMLButtonElement | null>(null);
  const openCardRef = useRef<HTMLDivElement | null>(null);

  // Load seen IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('oops-seen-notification-ids');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          seenIdsRef.current = new Set(arr);
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  const saveSeenIds = useCallback((newIds: string[]) => {
    newIds.forEach((id) => seenIdsRef.current.add(id));
    try {
      localStorage.setItem(
        'oops-seen-notification-ids',
        JSON.stringify(Array.from(seenIdsRef.current).slice(-200))
      );
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Poll notifications every 10s while tab is visible
  const [isVisible, setIsVisible] = useState(!document.hidden);
  useEffect(() => {
    const handleVis = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  const { data: notifData, refetch } = useQuery<PagedNotifications>({
    queryKey: ['island-notifications'],
    queryFn: () => apiRequest('/api/v1/notifications?size=20'),
    refetchInterval: isVisible ? 10000 : false,
    refetchOnWindowFocus: true,
  });

  const notifications = notifData?.items ?? [];
  const unreadList = notifications.filter((n) => !n.readAt);
  const unreadCount = unreadList.length;

  // Clear peek timer
  const clearPeekTimer = useCallback(() => {
    if (peekTimerRef.current) {
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
  }, []);

  // Start peek auto-collapse timer
  const startPeekTimer = useCallback(
    (durationMs: number) => {
      clearPeekTimer();
      peekTimerRef.current = setTimeout(() => {
        if (!isHoveredRef.current) {
          setPeekNotification(null);
          setPeekIncident(null);
        }
      }, durationMs);
    },
    [clearPeekTimer]
  );

  // Detect new notifications and trigger Peek
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    if (!initialLoadDone.current) {
      // First load: mark all existing as seen without peeking
      notifications.forEach((n) => seenIdsRef.current.add(n.id));
      saveSeenIds(notifications.map((n) => n.id));
      initialLoadDone.current = true;
      return;
    }

    // Check for unseen notifications
    const unseen = notifications.filter((n) => !seenIdsRef.current.has(n.id));
    if (unseen.length > 0) {
      const newest = unseen[0];
      saveSeenIds(unseen.map((n) => n.id));

      setPeekNotification(newest);
      setPeekMoreCount(unseen.length - 1);

      // Fetch incident details for peek styling if incidentId is present
      if (newest.incidentId) {
        queryClient
          .fetchQuery({
            queryKey: ['incident-peek', newest.incidentId],
            queryFn: () => apiRequest(`/api/v1/incidents/${newest.incidentId}`),
            staleTime: 60000,
          })
          .then((inc: any) => {
            const priority = (inc?.effectivePriority || inc?.priority || 'P3') as Priority;
            const slaStatus = inc?.slaStatus || 'ON_TRACK';
            setPeekIncident({ priority, slaStatus });

            if (slaStatus === 'BREACHED') {
              setHasBreachPulse(true);
              startPeekTimer(8000);
            } else {
              startPeekTimer(5000);
            }
          })
          .catch(() => {
            setPeekIncident(null);
            startPeekTimer(5000);
          });
      } else {
        setPeekIncident(null);
        startPeekTimer(5000);
      }
    }
  }, [notifications, queryClient, saveSeenIds, startPeekTimer]);

  // Keyboard shortcut: Pressing 'N' opens the Island, 'Escape' closes it
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'n' || e.key === 'N') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus trap management when Open
  useEffect(() => {
    if (isOpen) {
      openCardRef.current?.focus();
    } else {
      restButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Mark single notification read
  const markRead = async (id: string, incidentId?: string) => {
    try {
      await apiRequest(`/api/v1/notifications/${id}/read`, { method: 'POST' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      // Ignore
    }
    if (incidentId) {
      setIsOpen(false);
      setPeekNotification(null);
      navigate(`/incidents`);
    }
  };

  // Mark all as read optimistically
  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.readAt);
    if (unread.length === 0) return;

    try {
      await Promise.all(
        unread.map((n) => apiRequest(`/api/v1/notifications/${n.id}/read`, { method: 'POST' }))
      );
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      // Ignore
    }
  };

  const handleOpenClick = () => {
    clearPeekTimer();
    setPeekNotification(null);
    setIsOpen(true);
  };

  const isPeekP1 = peekIncident?.priority === 'P1';
  const isPeekP2 = peekIncident?.priority === 'P2';

  return (
    <>
      {/* Scrim overlay when Island is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="island-scrim"
            className={styles.scrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className={styles.islandWrapper}>
        <AnimatePresence mode="wait">
          {isOpen ? (
            /* ── 3. Open State (Card) ── */
            <motion.div
              key="island-open"
              ref={openCardRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
              className={`${styles.islandCard} ${styles.openCard}`}
              initial={{ scale: 0.95, opacity: 0, y: -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div className={styles.openHeader}>
                <div className={styles.openTitleRow}>
                  <h3 className={styles.openTitle}>Notifications</h3>
                  {unreadCount > 0 && (
                    <span className={styles.countText}>({unreadCount})</span>
                  )}
                </div>
                <div className={styles.openHeaderActions}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className={styles.openIncidentBtn}
                      onClick={markAllRead}
                    >
                      Mark all as read
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.openIncidentBtn}
                    onClick={() => setIsOpen(false)}
                    aria-label="Close notifications"
                  >
                    <X size={16} weight="light" />
                  </button>
                </div>
              </div>

              <div className={styles.listScroll}>
                {notifications.length === 0 ? (
                  <div className={styles.emptyState}>No notifications right now.</div>
                ) : (
                  notifications.map((item) => {
                    const isUnread = !item.readAt;
                    return (
                      <div
                        key={item.id}
                        className={`${styles.notificationItem} ${isUnread ? styles.itemUnread : ''}`}
                        onClick={() => markRead(item.id, item.incidentId)}
                      >
                        <div className={styles.itemDotWrapper}>
                          {isUnread && <span className={styles.signalDot} />}
                        </div>
                        <div className={styles.itemContent}>
                          <p className={styles.itemMessage}>{item.message}</p>
                          <div className={styles.itemFooter}>
                            <span className={styles.itemTime}>
                              {formatRelativeTime(item.createdAt)}
                            </span>
                            {item.emailDelivered && (
                              <span className={styles.emailTag}>Also emailed</span>
                            )}
                            {item.incidentId && (
                              <button
                                type="button"
                                className={styles.openIncidentBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markRead(item.id, item.incidentId);
                                }}
                              >
                                <span>Open incident</span>
                                <ArrowUpRight size={14} weight="light" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          ) : peekNotification ? (
            /* ── 2. Peek State ── */
            <motion.div
              key="island-peek"
              role="status"
              aria-live={peekIncident?.slaStatus === 'BREACHED' ? 'assertive' : 'polite'}
              className={`${styles.islandCard} ${styles.peekBox} ${
                isPeekP1 ? styles.peekP1 : isPeekP2 ? styles.peekP2 : ''
              }`}
              initial={{ scale: 0.9, opacity: 0, y: -4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={handleOpenClick}
              onMouseEnter={() => {
                isHoveredRef.current = true;
                clearPeekTimer();
              }}
              onMouseLeave={() => {
                isHoveredRef.current = false;
                startPeekTimer(3000);
              }}
            >
              {peekIncident?.priority && (
                <PriorityMarker priority={peekIncident.priority} />
              )}
              <div className={styles.peekContent}>
                <p className={styles.peekMessage}>{peekNotification.message}</p>
                <div className={styles.peekMeta}>
                  <span>{formatRelativeTime(peekNotification.createdAt)}</span>
                  {peekMoreCount > 0 && (
                    <span className={styles.moreBadge}>+{peekMoreCount} more</span>
                  )}
                </div>
              </div>
              <span
                className={`${styles.signalDot} ${
                  hasBreachPulse ? styles.signalDotPulse : ''
                }`}
              />
            </motion.div>
          ) : (
            /* ── 1. Rest State (Glass Pill) ── */
            <motion.button
              key="island-rest"
              ref={restButtonRef}
              type="button"
              role="status"
              aria-live="polite"
              aria-expanded={false}
              aria-label={`Notifications${
                unreadCount > 0 ? `, ${unreadCount} unread` : ', all caught up'
              }`}
              className={styles.restPill}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={handleOpenClick}
            >
              <span className={styles.ringMark} aria-hidden="true">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <circle cx="18.36" cy="5.64" r="2.5" fill="var(--red-fill)" />
                </svg>
              </span>
              {unreadCount > 0 && (
                <>
                  <span className={styles.countText}>{unreadCount}</span>
                  <span
                    className={`${styles.signalDot} ${
                      hasBreachPulse ? styles.signalDotPulse : ''
                    }`}
                  />
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

