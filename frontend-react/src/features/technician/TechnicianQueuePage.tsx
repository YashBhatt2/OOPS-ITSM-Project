import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CheckCircle, Play, Check } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { Button } from '@/components/ui/Button/Button';
import { StatusLabel } from '@/components/ui/StatusLabel/StatusLabel';
import { PriorityMarker } from '@/components/ui/PriorityMarker/PriorityMarker';
import { Dialog } from '@/components/ui/Dialog/Dialog';
import { Textarea } from '@/components/ui/Field/Field';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest, ApiConflictError } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import { Priority, IncidentStatus } from '@/lib/constants';
import { Incident, Dashboard, PagedResult } from './types';
import styles from './technician.module.css';

export function TechnicianQueuePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [resolvingIncident, setResolvingIncident] = useState<Incident | null>(null);
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [resolutionError, setResolutionError] = useState('');
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // 1. Dashboard data (for capacity and unread count)
  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'me'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  // 2. Technician assigned queue
  const {
    data: queueResult,
    isLoading,
    refetch,
  } = useQuery<PagedResult<Incident>>({
    queryKey: ['technician-queue'],
    queryFn: () =>
      apiRequest('/api/v1/incidents?includeClosed=false&page=0&size=50'),
    refetchInterval: 60000,
  });

  // Acknowledge Mutation
  const ackMutation = useMutation({
    mutationFn: async (inc: Incident) => {
      return await apiRequest(`/api/v1/incidents/${inc.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: inc.version }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Incident acknowledged.', type: 'success' });
      setConflictMessage(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'me'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident was updated by someone else. Refetched latest version.");
        refetch();
      } else {
        showToast({ title: 'Failed to acknowledge incident.', type: 'error' });
      }
    },
  });

  // Start Investigation Mutation
  const startMutation = useMutation({
    mutationFn: async (inc: Incident) => {
      return await apiRequest(`/api/v1/incidents/${inc.id}/start-investigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: inc.version }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Investigation started.', type: 'success' });
      setConflictMessage(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'me'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident was updated by someone else. Refetched latest version.");
        refetch();
      } else {
        showToast({ title: 'Failed to start investigation.', type: 'error' });
      }
    },
  });

  // Resolve Mutation
  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!resolvingIncident) return;
      return await apiRequest(`/api/v1/incidents/${resolvingIncident.id}/resolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: resolvingIncident.version,
          details: resolutionDetails.trim(),
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Incident resolved.', type: 'success' });
      setResolvingIncident(null);
      setResolutionDetails('');
      setConflictMessage(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'me'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident was updated by someone else. Refetched latest version.");
        refetch();
      } else {
        showToast({ title: 'Failed to resolve incident.', type: 'error' });
      }
    },
  });

  const rawItems = queueResult?.items ?? [];

  // Sort by nearest deadline
  const sortedItems = [...rawItems].sort((a, b) => {
    const timeA = a.resolutionDueAt
      ? new Date(a.resolutionDueAt).getTime()
      : a.responseDueAt
      ? new Date(a.responseDueAt).getTime()
      : Infinity;
    const timeB = b.resolutionDueAt
      ? new Date(b.resolutionDueAt).getTime()
      : b.responseDueAt
      ? new Date(b.responseDueAt).getTime()
      : Infinity;
    return timeA - timeB;
  });

  const capacity = dashboard?.capacity || 5;
  const activeWorkload = dashboard?.activeWorkload || sortedItems.length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'there';

  return (
    <div className={styles.page}>
      <Nav
        role="TECHNICIAN"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        <section className={styles.headerRow}>
          <div className={styles.titleBlock}>
            <h1 className={styles.pageTitle}>
              {getGreeting()}, {firstName}.
            </h1>
            <p className={styles.pageSub}>Assigned queue prioritized by upcoming SLA deadlines.</p>
          </div>

          {/* Capacity Meter */}
          <div className={styles.capacityCard}>
            <div className={styles.capacityHeader}>
              <span className={styles.capacityLabel}>Current capacity</span>
              <span className={styles.capacityValue}>
                {activeWorkload} of {capacity} active
              </span>
            </div>
            <div className={styles.capacityTrack}>
              {Array.from({ length: capacity }).map((_, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    styles.capacitySegment,
                    idx < activeWorkload && styles.capacitySegmentFilled,
                    activeWorkload > capacity && styles.capacitySegmentOverload
                  )}
                />
              ))}
            </div>
          </div>
        </section>

        {conflictMessage && (
          <div
            style={{
              backgroundColor: 'var(--tint-red)',
              border: '1px solid var(--red)',
              color: 'var(--red)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--r-md)',
              fontSize: 'var(--fs-body-s)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{conflictMessage}</span>
            <Button variant="ghost" size="compact" onClick={() => setConflictMessage(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Queue List */}
        {isLoading ? (
          <div className={styles.queueCardList}>
            <div className={styles.queueCard} style={{ height: '5rem' }} />
            <div className={styles.queueCard} style={{ height: '5rem' }} />
          </div>
        ) : sortedItems.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-9) var(--space-4)',
              backgroundColor: 'var(--surface-1)',
              borderRadius: 'var(--r-lg)',
              border: '1px solid var(--line-1)',
            }}
          >
            <h2 className={styles.pageTitle} style={{ fontSize: 'var(--fs-title-2)' }}>
              Your queue is clear
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: 'var(--fs-body)', marginTop: 'var(--space-2)' }}>
              No incidents currently assigned to you. New dispatches will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className={styles.queueCardList}>
              {sortedItems.map((inc) => (
                <div
                  key={inc.id}
                  className={styles.queueCard}
                  onClick={() => navigate(`/technician/incidents/${inc.id}`)}
                >
                  <div className={styles.queueCardTop}>
                    <span className={styles.reference}>{inc.reference}</span>
                    <PriorityMarker
                      priority={(inc.effectivePriority || inc.priority || 'P3') as Priority}
                    />
                  </div>
                  <p className={styles.queueCardTitle}>{inc.title}</p>
                  <div className={styles.queueCardBottom}>
                    <StatusLabel status={inc.status as IncidentStatus} />
                    <div onClick={(e) => e.stopPropagation()}>
                      {inc.status === 'ASSIGNED' && (
                        <Button
                          variant="secondary"
                          size="compact"
                          isLoading={ackMutation.isPending}
                          onClick={() => ackMutation.mutate(inc)}
                        >
                          <CheckCircle size={14} weight="light" />
                          <span>Acknowledge</span>
                        </Button>
                      )}
                      {inc.status === 'ACKNOWLEDGED' && (
                        <Button
                          variant="secondary"
                          size="compact"
                          isLoading={startMutation.isPending}
                          onClick={() => startMutation.mutate(inc)}
                        >
                          <Play size={14} weight="light" />
                          <span>Investigate</span>
                        </Button>
                      )}
                      {inc.status === 'IN_PROGRESS' && (
                        <Button
                          variant="primary"
                          size="compact"
                          onClick={() => {
                            setResolvingIncident(inc);
                            setResolutionDetails('');
                            setResolutionError('');
                          }}
                        >
                          <Check size={14} weight="light" />
                          <span>Resolve</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className={styles.tableWrapper}>
              <div className={styles.queuePanel}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Reference</th>
                      <th className={styles.th}>Priority</th>
                      <th className={styles.th}>Title</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Deadline</th>
                      <th className={styles.th} style={{ textAlign: 'right' }}>
                        Next action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((inc) => (
                      <tr
                        key={inc.id}
                        className={styles.tr}
                        onClick={() => navigate(`/technician/incidents/${inc.id}`)}
                      >
                        <td className={styles.td}>
                          <span className={styles.reference}>{inc.reference}</span>
                        </td>
                        <td className={styles.td}>
                          <PriorityMarker
                            priority={(inc.effectivePriority || inc.priority || 'P3') as Priority}
                          />
                        </td>
                        <td className={styles.td}>{inc.title}</td>
                        <td className={styles.td}>
                          <StatusLabel status={inc.status as IncidentStatus} />
                        </td>
                        <td className={styles.tdMuted}>
                          {inc.resolutionDueAt
                            ? formatRelativeTime(inc.resolutionDueAt)
                            : inc.responseDueAt
                            ? formatRelativeTime(inc.responseDueAt)
                            : '—'}
                        </td>
                        <td
                          className={styles.td}
                          style={{ textAlign: 'right' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {inc.status === 'ASSIGNED' && (
                            <Button
                              variant="secondary"
                              size="compact"
                              isLoading={ackMutation.isPending}
                              onClick={() => ackMutation.mutate(inc)}
                            >
                              <CheckCircle size={14} weight="light" />
                              <span>Acknowledge</span>
                            </Button>
                          )}
                          {inc.status === 'ACKNOWLEDGED' && (
                            <Button
                              variant="secondary"
                              size="compact"
                              isLoading={startMutation.isPending}
                              onClick={() => startMutation.mutate(inc)}
                            >
                              <Play size={14} weight="light" />
                              <span>Investigate</span>
                            </Button>
                          )}
                          {inc.status === 'IN_PROGRESS' && (
                            <Button
                              variant="primary"
                              size="compact"
                              onClick={() => {
                                setResolvingIncident(inc);
                                setResolutionDetails('');
                                setResolutionError('');
                              }}
                            >
                              <Check size={14} weight="light" />
                              <span>Resolve</span>
                            </Button>
                          )}
                          {inc.status === 'RESOLVED' && (
                            <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                              Awaiting verification
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Resolve Dialog */}
      {resolvingIncident && (
        <Dialog
          open={Boolean(resolvingIncident)}
          onOpenChange={(open) => {
            if (!open) setResolvingIncident(null);
          }}
          title={`Resolve ${resolvingIncident.reference}`}
          description="Document the root cause and the steps taken to fix the issue."
          actions={
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="ghost" size="compact" onClick={() => setResolvingIncident(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="compact"
                isLoading={resolveMutation.isPending}
                onClick={() => {
                  if (!resolutionDetails.trim()) {
                    setResolutionError('Resolution details are required.');
                    return;
                  }
                  resolveMutation.mutate();
                }}
              >
                Confirm resolution
              </Button>
            </div>
          }
        >
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Textarea
              id="resolve-details"
              label="Resolution summary"
              placeholder="e.g. Cleared stuck spooler service and rebooted print server..."
              rows={4}
              value={resolutionDetails}
              onChange={(e) => {
                setResolutionDetails(e.target.value);
                if (e.target.value.trim()) setResolutionError('');
              }}
              error={resolutionError}
              required
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
