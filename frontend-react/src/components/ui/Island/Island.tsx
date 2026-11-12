import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ArrowUpRight, X, Check } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import { PriorityMarker } from '../PriorityMarker/PriorityMarker';
import { Priority } from '@/lib/constants';
import { subscribeIslandDevAction } from './islandDevBridge';
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

// Spring parameters tuned for the Island container morph
export const ISLAND_SPRING = {
  type: 'spring',
  stiffness: 410,
  damping: 33,
  mass: 0.88,
} as const;

export const EASING_SPRING = [0.16, 1, 0.3, 1] as const;

// Rolling Number component for vertical odometer animation
const RollingNumber: React.FC<{ value: number; isReducedMotion: boolean }> = ({
  value,
  isReducedMotion,
}) => {
  return (
    <span className={styles.rollingNumberContainer} aria-hidden="true">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={isReducedMotion ? { opacity: 0 } : { y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={isReducedMotion ? { opacity: 0 } : { y: 12, opacity: 0 }}
          transition={{
            duration: isReducedMotion ? 0.08 : 0.22,
            ease: EASING_SPRING,
          }}
          className={styles.countText}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export const Island: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [peekNotification, setPeekNotification] = useState<NotificationItem | null>(null);
  const [peekMoreCount, setPeekMoreCount] = useState(0);
  const [peekIncident, setPeekIncident] = useState<IncidentPeekData | null>(null);
  const [hasBreachPulse, setHasBreachPulse] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [peekDuration, setPeekDuration] = useState(5000);
  const [peekRemainingTime, setPeekRemainingTime] = useState(5000);

  // Dev overrides & error simulation
  const [syntheticNotifications, setSyntheticNotifications] = useState<NotificationItem[] | null>(null);
  const [isDevError, setIsDevError] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [cardPosition, setCardPosition] = useState<{ top: number; right: number } | null>(null);

  // Measure anchor position for portaled open card
  useEffect(() => {
    if (isOpen && restButtonRef.current) {
      const updatePosition = () => {
        const rect = restButtonRef.current?.getBoundingClientRect();
        if (rect) {
          setCardPosition({
            top: rect.bottom + 8,
            right: Math.max(16, window.innerWidth - rect.right),
          });
        }
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  // References
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekStartTimeRef = useRef<number>(0);
  const isHoveredOrFocusedRef = useRef(false);
  const restButtonRef = useRef<HTMLButtonElement | null>(null);
  const openCardRef = useRef<HTMLDivElement | null>(null);
  const wasTabHiddenRef = useRef(false);

  // Check reduced motion
  useEffect(() => {
    const checkMotion = () => {
      const reduced =
        document.documentElement.getAttribute('data-reduced-motion') === 'true' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setIsReducedMotion(reduced);
    };
    checkMotion();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', checkMotion);
    return () => media.removeEventListener('change', checkMotion);
  }, []);

  // Helper to get role-based incident detail link
  const getIncidentPath = useCallback(
    (incidentId: string) => {
      if (user?.role === 'ADMIN') return `/admin/incidents/${incidentId}`;
      if (user?.role === 'TECHNICIAN') return `/technician/incidents/${incidentId}`;
      return `/employee/incidents/${incidentId}`;
    },
    [user?.role]
  );

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
      // Ignore
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
      // Ignore
    }
  }, []);

  // Polling with TanStack Query
  const [isVisible, setIsVisible] = useState(!document.hidden);
  useEffect(() => {
    const handleVis = () => {
      const hidden = document.hidden;
      setIsVisible(!hidden);
      if (hidden) {
        wasTabHiddenRef.current = true;
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  const { data: notifData, refetch, isError: queryIsError } = useQuery<PagedNotifications>({
    queryKey: ['island-notifications'],
    queryFn: () => apiRequest('/api/v1/notifications?size=20'),
    refetchInterval: isVisible ? 10000 : false,
    refetchOnWindowFocus: true,
  });

  const liveNotifications = notifData?.items ?? [];
  const notifications = syntheticNotifications ?? liveNotifications;
  const isError = isDevError || queryIsError;

  const unreadList = notifications.filter((n) => !n.readAt);
  const unreadCount = unreadList.length;

  // Split into "New" and "Earlier"
  const newNotifications = notifications.filter((n) => !n.readAt);
  const earlierNotifications = notifications.filter((n) => !!n.readAt);

  // Clear peek timer
  const clearPeekTimer = useCallback(() => {
    if (peekTimerRef.current) {
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
  }, []);

  // Start or resume peek auto-collapse timer
  const startPeekTimer = useCallback(
    (durationMs: number) => {
      clearPeekTimer();
      setPeekDuration(durationMs);
      setPeekRemainingTime(durationMs);
      peekStartTimeRef.current = Date.now();

      peekTimerRef.current = setTimeout(() => {
        if (!isHoveredOrFocusedRef.current) {
          setPeekNotification(null);
          setPeekIncident(null);
          setHasBreachPulse(false);
          setIsPaused(false);
        }
      }, durationMs);
    },
    [clearPeekTimer]
  );

  const pausePeekTimer = useCallback(() => {
    if (peekTimerRef.current) {
      clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
      const elapsed = Date.now() - peekStartTimeRef.current;
      const remaining = Math.max(500, peekDuration - elapsed);
      setPeekRemainingTime(remaining);
      setIsPaused(true);
    }
  }, [peekDuration]);

  const resumePeekTimer = useCallback(() => {
    setIsPaused(false);
    startPeekTimer(peekRemainingTime);
  }, [peekRemainingTime, startPeekTimer]);

  // Trigger Peek presentation
  const triggerPeek = useCallback(
    (item: NotificationItem, moreCount: number, priority?: Priority, slaStatus?: string) => {
      setPeekNotification(item);
      setPeekMoreCount(moreCount);
      setPeekIncident({ priority: priority || 'P3', slaStatus: slaStatus || 'ON_TRACK' });

      const isBreach = slaStatus === 'BREACHED';
      if (isBreach) {
        setHasBreachPulse(true);
        // Haptic feedback for breach if supported
        if (!isReducedMotion && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch {
            // Ignore
          }
        }
        startPeekTimer(8000);
      } else {
        setHasBreachPulse(false);
        startPeekTimer(5000);
      }
    },
    [isReducedMotion, startPeekTimer]
  );

  // Subscribe to Dev Playground events
  useEffect(() => {
    const unsubscribe = subscribeIslandDevAction((action) => {
      if (action.type === 'FIRE_NOTIFICATION') {
        const item: NotificationItem = {
          id: action.notification.id,
          incidentId: action.notification.incidentId,
          message: action.notification.message,
          createdAt: action.notification.createdAt,
          readAt: action.notification.readAt,
          emailDelivered: action.notification.emailDelivered,
        };
        setSyntheticNotifications((prev) => [item, ...(prev || liveNotifications)]);
        saveSeenIds([item.id]);
        triggerPeek(item, 0, action.notification.priority, action.notification.slaStatus);
      } else if (action.type === 'FIRE_BURST') {
        const items = action.notifications.map((n) => ({
          id: n.id,
          incidentId: n.incidentId,
          message: n.message,
          createdAt: n.createdAt,
          readAt: n.readAt,
          emailDelivered: n.emailDelivered,
        }));
        setSyntheticNotifications((prev) => [...items, ...(prev || liveNotifications)]);
        saveSeenIds(items.map((i) => i.id));
        const newest = items[0];
        triggerPeek(newest, items.length - 1, action.notifications[0]?.priority, action.notifications[0]?.slaStatus);
      } else if (action.type === 'SET_EMPTY') {
        setSyntheticNotifications([]);
        setPeekNotification(null);
      } else if (action.type === 'SET_ERROR') {
        setIsDevError(!!action.error);
      } else if (action.type === 'RESET') {
        setSyntheticNotifications(null);
        setIsDevError(false);
        setPeekNotification(null);
        refetch();
      }
    });

    return unsubscribe;
  }, [liveNotifications, refetch, saveSeenIds, triggerPeek]);

  // Live polling notification arrival detection & tab hidden-to-visible coalescing
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    if (!initialLoadDone.current) {
      notifications.forEach((n) => seenIdsRef.current.add(n.id));
      saveSeenIds(notifications.map((n) => n.id));
      initialLoadDone.current = true;
      return;
    }

    // Check for unseen notifications
    const unseen = notifications.filter((n) => !seenIdsRef.current.has(n.id));
    if (unseen.length === 0) return;

    // If tab was hidden and now shown, coalesce everything missed into one summary peek
    const newest = unseen[0];
    saveSeenIds(unseen.map((n) => n.id));

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
          triggerPeek(newest, unseen.length - 1, priority, slaStatus);
        })
        .catch(() => {
          triggerPeek(newest, unseen.length - 1, 'P3', 'ON_TRACK');
        });
    } else {
      triggerPeek(newest, unseen.length - 1, 'P3', 'ON_TRACK');
    }

    wasTabHiddenRef.current = false;
  }, [notifications, queryClient, saveSeenIds, triggerPeek]);

  // Keyboard shortcut: Pressing 'N' toggles, 'Escape' closes
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
        if (!isOpen) {
          clearPeekTimer();
          setPeekNotification(null);
        }
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, clearPeekTimer]);

  // Focus trap / management
  useEffect(() => {
    if (isOpen) {
      openCardRef.current?.focus();
    } else {
      restButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Mark single notification read
  const markRead = async (id: string, incidentId?: string) => {
    if (syntheticNotifications) {
      setSyntheticNotifications((prev) =>
        prev
          ? prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
          : null
      );
    } else {
      try {
        await apiRequest(`/api/v1/notifications/${id}/read`, { method: 'POST' });
        refetch();
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } catch {
        // Ignore
      }
    }

    if (incidentId) {
      setIsOpen(false);
      setPeekNotification(null);
      navigate(getIncidentPath(incidentId));
    }
  };

  // Mark all as read optimistically
  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.readAt);
    if (unread.length === 0) return;

    if (syntheticNotifications) {
      setSyntheticNotifications((prev) =>
        prev ? prev.map((n) => ({ ...n, readAt: new Date().toISOString() })) : null
      );
    } else {
      try {
        await Promise.all(
          unread.map((n) => apiRequest(`/api/v1/notifications/${n.id}/read`, { method: 'POST' }))
        );
        refetch();
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } catch {
        // Ignore
      }
    }
  };

  const handleOpenClick = () => {
    clearPeekTimer();
    setPeekNotification(null);
    setIsOpen(true);
  };

  const handlePeekClick = () => {
    if (peekNotification?.incidentId) {
      markRead(peekNotification.id, peekNotification.incidentId);
    } else {
      handleOpenClick();
    }
  };

  const isPeekP1 = peekIncident?.priority === 'P1' || peekIncident?.slaStatus === 'BREACHED';
  const isPeekP2 = peekIncident?.priority === 'P2' || peekIncident?.slaStatus === 'AT_RISK';

  // Staging variants: fades out before shrinking, fades and unblurs in only after container has grown ~70%
  const stagedContentVariants = {
    initial: {
      opacity: 0,
      filter: isReducedMotion ? 'none' : 'blur(5px)',
    },
    animate: {
      opacity: 1,
      filter: 'none',
      transition: {
        delay: isReducedMotion ? 0 : 0.12,
        duration: isReducedMotion ? 0.08 : 0.20,
        ease: EASING_SPRING,
      },
    },
    exit: {
      opacity: 0,
      filter: isReducedMotion ? 'none' : 'blur(4px)',
      transition: {
        duration: isReducedMotion ? 0.08 : 0.10,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <div className={styles.islandContainer}>
      {/* ── 1. Rest State (Glass Pill) ── */}
      <motion.button
        ref={restButtonRef}
        type="button"
        role="button"
        aria-expanded={isOpen}
        aria-label={`Notifications${
          unreadCount > 0 ? `, ${unreadCount} unread` : ', all caught up'
        }`}
        className={clsx(styles.islandSurface, styles.restPillLayout)}
        layout="position"
        whileTap={{ scale: 0.98 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 40 }}
        dragElastic={0.25}
        onDragEnd={(_, info) => {
          if (info.offset.y > 25 || info.velocity.y > 200) {
            handleOpenClick();
          }
        }}
        onClick={() => {
          if (isOpen) setIsOpen(false);
          else handleOpenClick();
        }}
      >
        <span className={styles.bellIconWrapper} aria-hidden="true">
          <Bell size={18} weight={unreadCount > 0 ? 'regular' : 'light'} />
        </span>
        {unreadCount > 0 && (
          <>
            <RollingNumber value={unreadCount} isReducedMotion={isReducedMotion} />
            <span
              className={clsx(
                styles.signalDot,
                hasBreachPulse && styles.signalDotPulse
              )}
            />
          </>
        )}
      </motion.button>

      {/* ── 3. Modal Scrim & Open Card Portaled to document.body ── */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                key="island-modal-scrim"
                className={styles.scrim}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                key="island-open-card"
                ref={openCardRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Notifications"
                className={clsx(styles.islandSurface, styles.openCardLayout)}
                style={
                  cardPosition
                    ? {
                        top: `${cardPosition.top}px`,
                        right: `${cardPosition.right}px`,
                      }
                    : undefined
                }
                initial={{ scale: 0.94, opacity: 0, y: -10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: -8 }}
                transition={isReducedMotion ? { duration: 0.1 } : ISLAND_SPRING}
                drag="y"
                dragConstraints={{ top: -60, bottom: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.y < -25 || info.velocity.y < -200) {
                    setIsOpen(false);
                  }
                }}
              >
            {/* Staged Header */}
            <motion.div
              className={styles.openHeader}
              variants={stagedContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout="position"
            >
              <div className={styles.openTitleRow}>
                <div className={styles.headerIconBadge} aria-hidden="true">
                  <Bell size={16} weight="light" />
                </div>
                <h3 className={styles.openTitle}>Notifications</h3>
                {unreadCount > 0 && (
                  <span className={styles.unreadPillBadge}>{unreadCount} unread</span>
                )}
                {isError && (
                  <span className={styles.errorNotice} role="alert">
                    Can't refresh
                  </span>
                )}
              </div>
              <div className={styles.openHeaderActions}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className={styles.ghostActionBtn}
                    onClick={markAllRead}
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                >
                  <X size={16} weight="light" />
                </button>
              </div>
            </motion.div>

            {/* Staged Grouped List */}
            <motion.div
              className={styles.listScroll}
              variants={stagedContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout="position"
            >
              {notifications.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyTitle}>Nothing new.</p>
                  <p className={styles.emptyDesc}>No unread notices or incident updates.</p>
                </div>
              ) : (
                <>
                  {/* Group 1: New */}
                  {newNotifications.length > 0 && (
                    <div className={styles.groupHeader}>New</div>
                  )}
                  {newNotifications.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      className={clsx(styles.notificationItem, styles.itemUnread)}
                      initial={isReducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: idx < 6 ? idx * 0.04 : 0.24,
                        duration: 0.2,
                        ease: EASING_SPRING,
                      }}
                      drag="x"
                      dragConstraints={{ left: -50, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -30 || info.velocity.x < -180) {
                          markRead(item.id);
                        }
                      }}
                      onClick={() => markRead(item.id, item.incidentId)}
                    >
                      <div className={styles.itemDotWrapper}>
                        <motion.span
                          layout
                          className={styles.signalDot}
                          exit={{ scale: 0, opacity: 0, x: -8 }}
                        />
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

                      {/* Quick Hover Check Button */}
                      <button
                        type="button"
                        className={styles.quickCheckBtn}
                        title="Mark as read"
                        aria-label="Mark as read"
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(item.id);
                        }}
                      >
                        <Check size={13} weight="bold" />
                      </button>
                    </motion.div>
                  ))}

                  {/* Group 2: Earlier */}
                  {earlierNotifications.length > 0 && (
                    <div className={styles.groupHeader}>Earlier</div>
                  )}
                  {earlierNotifications.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      className={clsx(styles.notificationItem, styles.itemReadDimmed)}
                      initial={isReducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 0.65, y: 0 }}
                      transition={{
                        delay: (idx + newNotifications.length) < 6 ? (idx + newNotifications.length) * 0.04 : 0.24,
                        duration: 0.2,
                        ease: EASING_SPRING,
                      }}
                      onClick={() => markRead(item.id, item.incidentId)}
                    >
                      <div className={styles.itemDotWrapper} />
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
                    </motion.div>
                  ))}
                </>
              )}
            </motion.div>
          </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── 2. Peek State (Floating Frosted Banner when not open) ── */}
      <AnimatePresence mode="popLayout">
        {peekNotification && !isOpen ? (
          <motion.div
            key="island-peek-banner"
            role="status"
            aria-live={peekIncident?.slaStatus === 'BREACHED' ? 'assertive' : 'polite'}
            className={clsx(
              styles.islandSurface,
              styles.peekLayout,
              isPeekP1 && styles.peekP1,
              isPeekP2 && styles.peekP2
            )}
            initial={{ scale: 0.9, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -6 }}
            transition={isReducedMotion ? { duration: 0.1 } : ISLAND_SPRING}
            whileTap={{ scale: 0.98 }}
            onClick={handlePeekClick}
            onMouseEnter={() => {
              isHoveredOrFocusedRef.current = true;
              pausePeekTimer();
            }}
            onMouseLeave={() => {
              isHoveredOrFocusedRef.current = false;
              resumePeekTimer();
            }}
            onFocus={() => {
              isHoveredOrFocusedRef.current = true;
              pausePeekTimer();
            }}
            onBlur={() => {
              isHoveredOrFocusedRef.current = false;
              resumePeekTimer();
            }}
          >
            {/* Breach Perimeter Hairline Trace */}
            {hasBreachPulse && (
              <svg className={styles.breachTraceSvg} aria-hidden="true">
                <rect
                  x="1"
                  y="1"
                  width="calc(100% - 2px)"
                  height="calc(100% - 2px)"
                  rx="15"
                  className={styles.breachTraceRect}
                />
              </svg>
            )}

            {/* Left Priority Marker (Draws In) */}
            <motion.div
              className={styles.peekIconBadge}
              initial={isReducedMotion ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.22, ease: EASING_SPRING }}
            >
              {peekIncident?.priority ? (
                <PriorityMarker priority={peekIncident.priority} />
              ) : (
                <Bell size={18} weight="regular" />
              )}
            </motion.div>

            {/* Middle Message (Staged) */}
            <motion.div
              className={styles.peekContent}
              variants={stagedContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout="position"
            >
              <div className={styles.peekEyebrowRow}>
                <span className={styles.peekEyebrow}>
                  {peekIncident?.slaStatus === 'BREACHED'
                    ? 'SLA BREACH ALERT'
                    : peekIncident?.slaStatus === 'AT_RISK'
                    ? 'SLA AT RISK'
                    : peekNotification.incidentId
                    ? 'INCIDENT NOTICE'
                    : 'NEW NOTIFICATION'}
                </span>
                <span className={styles.peekTime}>
                  {formatRelativeTime(peekNotification.createdAt)}
                </span>
              </div>
              <p className={styles.peekMessage}>{peekNotification.message}</p>
              {peekMoreCount > 0 && (
                <div className={styles.peekMoreTag}>+{peekMoreCount} more</div>
              )}
            </motion.div>

            {/* Right Status Action */}
            <motion.div
              className={styles.peekRightAction}
              variants={stagedContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout="position"
            >
              <span
                className={clsx(
                  styles.signalDot,
                  hasBreachPulse && styles.signalDotPulse
                )}
              />
              <ArrowUpRight size={16} weight="light" className={styles.peekArrow} />
            </motion.div>

            {/* 2px Bottom Hairline Countdown Timer (Pauses on Hover/Focus) */}
            <div className={styles.peekHairlineTrack} aria-hidden="true">
              <div
                className={clsx(
                  styles.peekHairlineBar,
                  isPeekP1 && styles.peekHairlineBarP1,
                  isPeekP2 && styles.peekHairlineBarP2
                )}
                style={{
                  animationDuration: `${peekDuration}ms`,
                  animationPlayState: isPaused ? 'paused' : 'running',
                }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
