import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Sliders, LinkSimple, ArrowsClockwise } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { BackButton } from '@/components/ui/BackButton/BackButton';
import { StatusLabel } from '@/components/ui/StatusLabel/StatusLabel';
import { PriorityMarker } from '@/components/ui/PriorityMarker/PriorityMarker';
import { SlaMeter } from '@/components/ui/SlaMeter/SlaMeter';
import { Comment } from '@/components/ui/Comment/Comment';
import { Timeline } from '@/components/ui/Timeline/Timeline';
import { Textarea, Select } from '@/components/ui/Field/Field';
import { Button } from '@/components/ui/Button/Button';
import { Dialog } from '@/components/ui/Dialog/Dialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest, ApiConflictError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Priority, IncidentStatus, SlaStatus } from '@/lib/constants';
import { Incident, IncidentComment, HistoryEvent, Dashboard } from './types';
import { AssignmentDrawer } from './AssignmentDrawer';
import styles from './admin.module.css';

export function AdminIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [overridePriority, setOverridePriority] = useState<Priority>('P1');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState('');

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [targetIncidentId, setTargetIncidentId] = useState('');
  const [linkError, setLinkError] = useState('');

  const [commentText, setCommentText] = useState('');
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // 1. Incident details
  const {
    data: incident,
    isLoading: isIncidentLoading,
    refetch: refetchIncident,
  } = useQuery<Incident>({
    queryKey: ['incident', id],
    queryFn: () => apiRequest(`/api/v1/incidents/${id}`),
    enabled: Boolean(id),
  });

  // 2. Comments
  const { data: comments = [], refetch: refetchComments } = useQuery<IncidentComment[]>({
    queryKey: ['incident-comments', id],
    queryFn: () => apiRequest(`/api/v1/incidents/${id}/comments`),
    enabled: Boolean(id),
  });

  // 3. History
  const { data: history = [] } = useQuery<HistoryEvent[]>({
    queryKey: ['incident-history', id],
    queryFn: () => apiRequest(`/api/v1/incidents/${id}/history`),
    enabled: Boolean(id),
  });

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  // Priority Override Mutation
  const overrideMutation = useMutation({
    mutationFn: async () => {
      if (!incident) return;
      return await apiRequest(`/api/v1/incidents/${id}/priority-overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: incident.version,
          priority: overridePriority,
          reason: overrideReason.trim(),
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: `Priority overridden to ${overridePriority}.`, type: 'success' });
      setPriorityDialogOpen(false);
      setOverrideReason('');
      setConflictMessage(null);
      refetchIncident();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were viewing it. We've loaded the latest version.");
        refetchIncident();
      } else {
        showToast({ title: 'Failed to override priority.', type: 'error' });
      }
    },
  });

  // Recalculate Priority Mutation
  const recalcMutation = useMutation({
    mutationFn: async () => {
      if (!incident) return;
      return await apiRequest(`/api/v1/incidents/${id}/priority-recalculation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: incident.version }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Priority recalculated.', type: 'success' });
      setConflictMessage(null);
      refetchIncident();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were viewing it. We've loaded the latest version.");
        refetchIncident();
      } else {
        showToast({ title: 'Failed to recalculate priority.', type: 'error' });
      }
    },
  });

  // Link Incident Mutation
  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!incident) return;
      return await apiRequest(`/api/v1/incidents/${id}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: incident.version,
          targetIncidentId: targetIncidentId.trim(),
          type: 'RELATED',
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Incident relationship linked.', type: 'success' });
      setLinkDialogOpen(false);
      setTargetIncidentId('');
      setConflictMessage(null);
      refetchIncident();
      queryClient.invalidateQueries({ queryKey: ['incident-history', id] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were viewing it. We've loaded the latest version.");
        refetchIncident();
      } else {
        showToast({ title: 'Failed to link incident.', type: 'error' });
      }
    },
  });

  // Post Internal Note
  const postNoteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/v1/incidents/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: commentText.trim(),
          kind: 'INTERNAL_NOTE',
          visibility: 'INTERNAL',
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Internal note added.', type: 'success' });
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['incident-history', id] });
    },
    onError: () => {
      showToast({ title: 'Failed to post note.', type: 'error' });
    },
  });

  if (isIncidentLoading) {
    return (
      <div className={styles.page}>
        <Nav role="ADMIN" userDisplayName={user?.displayName} onLogout={logout} />
        <main className={styles.main}>
          <div style={{ height: '300px', backgroundColor: 'var(--surface-1)', borderRadius: 'var(--r-lg)' }} />
        </main>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className={styles.page}>
        <Nav role="ADMIN" userDisplayName={user?.displayName} onLogout={logout} />
        <main className={styles.main}>
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Incident not found</p>
            <Link to="/admin" style={{ color: 'var(--blue)', marginTop: 'var(--space-2)', display: 'inline-block' }}>
              Return to overview
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Nav
        role="ADMIN"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        <BackButton to="/admin/incidents" label="Back to incidents" />

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

        {/* Status Strip & Admin Actions */}
        <section
          style={{
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--line-1)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
            marginBottom: 'var(--space-5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className={styles.incidentRef}>{incident.reference}</span>
            <StatusLabel status={incident.status as IncidentStatus} />
            <PriorityMarker
              priority={(incident.effectivePriority || incident.priority || 'P3') as Priority}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Button variant="secondary" size="compact" onClick={() => setAssignmentOpen(true)}>
              <UserPlus size={16} weight="light" />
              <span>Assign</span>
            </Button>
            <Button variant="secondary" size="compact" onClick={() => setPriorityDialogOpen(true)}>
              <Sliders size={16} weight="light" />
              <span>Override priority</span>
            </Button>
            <Button
              variant="ghost"
              size="compact"
              isLoading={recalcMutation.isPending}
              onClick={() => recalcMutation.mutate()}
            >
              <ArrowsClockwise size={16} weight="light" />
              <span>Recalculate</span>
            </Button>
            <Button variant="ghost" size="compact" onClick={() => setLinkDialogOpen(true)}>
              <LinkSimple size={16} weight="light" />
              <span>Link related</span>
            </Button>
          </div>
        </section>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
          <article
            style={{
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--line-1)',
              borderRadius: 'var(--r-xl)',
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <h1 className={styles.pageTitle} style={{ fontSize: 'var(--fs-title-1)', fontWeight: 600 }}>
              {incident.title}
            </h1>
            <p
              style={{
                fontSize: 'var(--fs-body-l)',
                color: 'var(--text-2)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}
            >
              {incident.description}
            </p>
          </article>

          {/* SLA section */}
          <div
            style={{
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--line-1)',
              borderRadius: 'var(--r-lg)',
              padding: 'var(--space-4)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            <SlaMeter
              label="Response"
              dueAt={incident.responseDueAt || null}
              targetSeconds={7200}
              slaStatus={incident.slaStatus as SlaStatus}
            />
            <SlaMeter
              label="Resolution"
              dueAt={incident.resolutionDueAt || null}
              targetSeconds={28800}
              slaStatus={incident.slaStatus as SlaStatus}
            />
          </div>

          {/* Activity Stream */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 className={styles.sectionTitle}>Full incident audit & comments</h2>
            {comments.map((c) => (
              <Comment
                key={c.id}
                id={c.id}
                authorName={c.authorName || 'Staff'}
                createdAt={c.createdAt}
                body={c.body}
                kind={c.kind}
              />
            ))}

            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--line-1)',
                borderRadius: 'var(--r-lg)',
                padding: 'var(--space-4)',
              }}
            >
              <Textarea
                id="admin-internal-note"
                label="Add administrative internal note"
                placeholder="Log internal dispatch notes or escalations..."
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                <Button
                  variant="primary"
                  size="compact"
                  disabled={!commentText.trim()}
                  isLoading={postNoteMutation.isPending}
                  onClick={() => postNoteMutation.mutate()}
                >
                  Post note
                </Button>
              </div>
            </div>
          </section>

          {/* Lifecycle Timeline */}
          <div
            style={{
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--line-1)',
              borderRadius: 'var(--r-lg)',
              padding: 'var(--space-4)',
            }}
          >
            <h2 className={styles.sectionTitle} style={{ marginBottom: 'var(--space-3)' }}>
              Audit timeline
            </h2>
            <Timeline
              items={history.map((h) => ({
                id: h.id,
                title: h.event,
                timestamp: formatDateTime(h.createdAt),
                description: h.details,
                actor: h.actorName,
              }))}
            />
          </div>
        </div>
      </main>

      {/* Assignment Drawer */}
      {assignmentOpen && (
        <AssignmentDrawer
          incidentId={incident.id}
          incidentVersion={incident.version}
          onClose={() => setAssignmentOpen(false)}
          onAssigned={() => {
            setAssignmentOpen(false);
            refetchIncident();
          }}
        />
      )}

      {/* Priority Override Dialog */}
      <Dialog
        open={priorityDialogOpen}
        onOpenChange={setPriorityDialogOpen}
        title="Override incident priority"
        description="Priority overrides take precedence over the calculated SLA matrix. A documented reason is required."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" size="compact" onClick={() => setPriorityDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="compact"
              isLoading={overrideMutation.isPending}
              onClick={() => {
                if (!overrideReason.trim()) {
                  setOverrideError('A reason for the priority override is required.');
                  return;
                }
                overrideMutation.mutate();
              }}
            >
              Apply override
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          <Select
            id="override-p"
            label="New priority"
            options={[
              { value: 'P1', label: 'P1 — Critical' },
              { value: 'P2', label: 'P2 — High' },
              { value: 'P3', label: 'P3 — Moderate' },
              { value: 'P4', label: 'P4 — Low' },
            ]}
            value={overridePriority}
            onChange={(e) => setOverridePriority(e.target.value as Priority)}
          />
          <Textarea
            id="override-reason"
            label="Justification reason"
            placeholder="e.g. VIP executive request or active branch outage..."
            rows={3}
            value={overrideReason}
            onChange={(e) => {
              setOverrideReason(e.target.value);
              if (e.target.value.trim()) setOverrideError('');
            }}
            error={overrideError}
            required
          />
        </div>
      </Dialog>

      {/* Link Incident Dialog */}
      <Dialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        title="Link related incident"
        description="Link this incident to another known problem or parent incident."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" size="compact" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="compact"
              isLoading={linkMutation.isPending}
              onClick={() => {
                if (!targetIncidentId.trim()) {
                  setLinkError('Target incident ID is required.');
                  return;
                }
                linkMutation.mutate();
              }}
            >
              Link incident
            </Button>
          </div>
        }
      >
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Textarea
            id="target-id"
            label="Target incident ID"
            placeholder="Paste target incident UUID..."
            rows={2}
            value={targetIncidentId}
            onChange={(e) => {
              setTargetIncidentId(e.target.value);
              if (e.target.value.trim()) setLinkError('');
            }}
            error={linkError}
            required
          />
        </div>
      </Dialog>
    </div>
  );
}

