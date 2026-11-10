import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, X, Lock } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { Button } from '@/components/ui/Button/Button';
import { PriorityMarker } from '@/components/ui/PriorityMarker/PriorityMarker';
import { Dialog } from '@/components/ui/Dialog/Dialog';
import { Textarea } from '@/components/ui/Field/Field';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest, ApiConflictError } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import { Priority } from '@/lib/constants';
import { Incident, Dashboard, PagedResult } from './types';
import styles from './admin.module.css';

export function VerificationQueuePage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [rejectingIncident, setRejectingIncident] = useState<Incident | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // 1. Dashboard
  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  // 2. Incidents with status=RESOLVED
  const {
    data: resolvedResult,
    isLoading,
    refetch,
  } = useQuery<PagedResult<Incident>>({
    queryKey: ['incidents-verification-queue'],
    queryFn: () => apiRequest('/api/v1/incidents?status=RESOLVED&page=0&size=50'),
  });

  // Verify Mutation
  const verifyMutation = useMutation({
    mutationFn: async (inc: Incident) => {
      return await apiRequest(`/api/v1/incidents/${inc.id}/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: inc.version, note: 'Verified by administrator.' }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Incident verified.', type: 'success' });
      setConflictMessage(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were reviewing it. Refetched latest version.");
        refetch();
      } else {
        showToast({ title: 'Failed to verify incident.', type: 'error' });
      }
    },
  });

  // Reject Resolution Mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectingIncident) return;
      return await apiRequest(`/api/v1/incidents/${rejectingIncident.id}/resolution-rejections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: rejectingIncident.version,
          reason: rejectReason.trim(),
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Resolution rejected and returned for rework.', type: 'success' });
      setRejectingIncident(null);
      setRejectReason('');
      setConflictMessage(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were reviewing it. Refetched latest version.");
        refetch();
      } else {
        showToast({ title: 'Failed to reject resolution.', type: 'error' });
      }
    },
  });

  // Close Mutation
  const closeMutation = useMutation({
    mutationFn: async (inc: Incident) => {
      return await apiRequest(`/api/v1/incidents/${inc.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: inc.version }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Incident closed.', type: 'success' });
      setConflictMessage(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were reviewing it. Refetched latest version.");
        refetch();
      } else {
        showToast({ title: 'Failed to close incident.', type: 'error' });
      }
    },
  });

  const resolvedIncidents = resolvedResult?.items ?? [];

  return (
    <div className={styles.page}>
      <Nav
        role="ADMIN"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        <Link
          to="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--fs-body-s)',
            color: 'var(--text-2)',
            textDecoration: 'none',
            marginBottom: 'var(--space-4)',
            minHeight: '44px',
          }}
        >
          <ArrowLeft size={16} weight="light" />
          <span>Back to overview</span>
        </Link>

        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Verification queue</h1>
          <p className={styles.pageSub}>
            Review technician resolutions before final customer acceptance and closing.
          </p>
        </div>

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

        {isLoading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Loading verification queue…</p>
          </div>
        ) : resolvedIncidents.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Nothing to verify right now</p>
            <p className={styles.emptyText}>All resolved incidents have been verified or closed.</p>
          </div>
        ) : (
          <div className={styles.queuePanel}>
            {resolvedIncidents.map((inc) => (
              <div
                key={inc.id}
                className={styles.incidentRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)',
                  borderBottom: '1px solid var(--line-1)',
                  gap: 'var(--space-4)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: '280px' }}>
                  <span className={styles.incidentRef}>{inc.reference}</span>
                  <PriorityMarker priority={inc.priority as Priority} />
                  <Link
                    to={`/admin/incidents/${inc.id}`}
                    style={{
                      fontSize: 'var(--fs-body)',
                      fontWeight: 500,
                      color: 'var(--text-1)',
                      textDecoration: 'none',
                    }}
                  >
                    {inc.title}
                  </Link>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className={styles.incidentAge}>
                    Resolved {formatRelativeTime(inc.updatedAt)}
                  </span>

                  <Button
                    variant="primary"
                    size="compact"
                    isLoading={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate(inc)}
                  >
                    <Check size={14} weight="light" />
                    <span>Verify</span>
                  </Button>

                  <Button
                    variant="destructive"
                    size="compact"
                    onClick={() => {
                      setRejectingIncident(inc);
                      setRejectReason('');
                      setRejectError('');
                    }}
                  >
                    <X size={14} weight="light" />
                    <span>Reject</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="compact"
                    isLoading={closeMutation.isPending}
                    onClick={() => closeMutation.mutate(inc)}
                  >
                    <Lock size={14} weight="light" />
                    <span>Close</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Dialog */}
      {rejectingIncident && (
        <Dialog
          open={Boolean(rejectingIncident)}
          onOpenChange={(open) => {
            if (!open) setRejectingIncident(null);
          }}
          title={`Reject resolution for ${rejectingIncident.reference}`}
          description="Explain why the resolution is insufficient so the technician can address the remaining issues."
          actions={
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="ghost" size="compact" onClick={() => setRejectingIncident(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="compact"
                isLoading={rejectMutation.isPending}
                onClick={() => {
                  if (!rejectReason.trim()) {
                    setRejectError('A reason for rejection is required.');
                    return;
                  }
                  rejectMutation.mutate();
                }}
              >
                Send back for rework
              </Button>
            </div>
          }
        >
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Textarea
              id="reject-reason"
              label="Rejection explanation"
              placeholder="e.g. Issue recurred when customer tested, or steps omitted in documentation..."
              rows={4}
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (e.target.value.trim()) setRejectError('');
              }}
              error={rejectError}
              required
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}

