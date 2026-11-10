import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, CheckCircle, Play, Check, Lightbulb } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { StatusLabel } from '@/components/ui/StatusLabel/StatusLabel';
import { PriorityMarker } from '@/components/ui/PriorityMarker/PriorityMarker';
import { LifecycleBar } from '@/components/ui/LifecycleBar/LifecycleBar';
import { SlaMeter } from '@/components/ui/SlaMeter/SlaMeter';
import { Comment } from '@/components/ui/Comment/Comment';
import { Timeline } from '@/components/ui/Timeline/Timeline';
import { Textarea } from '@/components/ui/Field/Field';
import { Button } from '@/components/ui/Button/Button';
import { Dialog } from '@/components/ui/Dialog/Dialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest, ApiConflictError, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Priority, IncidentStatus, SlaStatus } from '@/lib/constants';
import { Incident, IncidentComment, HistoryEvent, ResolutionSuggestion, Dashboard } from './types';
import styles from './technician.module.css';

type CommentKind = 'COMMENT' | 'INTERNAL_NOTE' | 'INFORMATION_REQUEST';

export function TechnicianIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [commentKind, setCommentKind] = useState<CommentKind>('COMMENT');
  const [commentText, setCommentText] = useState('');
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [resolutionError, setResolutionError] = useState('');
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

  // 2. Comments (all comments including internal)
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

  // 4. Advisory resolution suggestions
  const { data: suggestions = [], isError: isSuggestionsError } = useQuery<ResolutionSuggestion[]>({
    queryKey: ['resolution-suggestions', id],
    queryFn: async () => {
      try {
        return await apiRequest(`/api/v1/incidents/${id}/resolution-suggestions`);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 503) {
          return [];
        }
        throw err;
      }
    },
    enabled: Boolean(id && incident?.status !== 'CLOSED' && incident?.status !== 'VERIFIED'),
    retry: false,
  });

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'me'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  // Action Mutations
  const ackMutation = useMutation({
    mutationFn: async () => {
      if (!incident) return;
      return await apiRequest(`/api/v1/incidents/${id}/acknowledgments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: incident.version }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Incident acknowledged.', type: 'success' });
      setConflictMessage(null);
      refetchIncident();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were viewing it. We've loaded the latest version.");
        refetchIncident();
      } else {
        showToast({ title: 'Failed to acknowledge incident.', type: 'error' });
      }
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!incident) return;
      return await apiRequest(`/api/v1/incidents/${id}/start-investigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: incident.version }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Investigation started.', type: 'success' });
      setConflictMessage(null);
      refetchIncident();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were viewing it. We've loaded the latest version.");
        refetchIncident();
      } else {
        showToast({ title: 'Failed to start investigation.', type: 'error' });
      }
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!incident) return;
      return await apiRequest(`/api/v1/incidents/${id}/resolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: incident.version,
          details: resolutionDetails.trim(),
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Incident marked as resolved.', type: 'success' });
      setResolveDialogOpen(false);
      setResolutionDetails('');
      setConflictMessage(null);
      refetchIncident();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were viewing it. We've loaded the latest version.");
        refetchIncident();
      } else {
        showToast({ title: 'Failed to resolve incident.', type: 'error' });
      }
    },
  });

  // Post Comment Mutation
  const postCommentMutation = useMutation({
    mutationFn: async () => {
      const visibility = commentKind === 'INTERNAL_NOTE' ? 'INTERNAL' : 'PUBLIC';
      return await apiRequest(`/api/v1/incidents/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: commentText.trim(),
          kind: commentKind,
          visibility,
        }),
      });
    },
    onSuccess: () => {
      showToast({
        title: commentKind === 'INTERNAL_NOTE' ? 'Internal note added.' : 'Comment posted.',
        type: 'success',
      });
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['incident-history', id] });
    },
    onError: () => {
      showToast({ title: 'Failed to post comment.', type: 'error' });
    },
  });

  if (isIncidentLoading) {
    return (
      <div className={styles.page}>
        <Nav role="TECHNICIAN" userDisplayName={user?.displayName} onLogout={logout} />
        <main className={styles.main}>
          <div style={{ height: '300px', backgroundColor: 'var(--surface-1)', borderRadius: 'var(--r-lg)' }} />
        </main>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className={styles.page}>
        <Nav role="TECHNICIAN" userDisplayName={user?.displayName} onLogout={logout} />
        <main className={styles.main}>
          <div style={{ textAlign: 'center', padding: 'var(--space-9)' }}>
            <h2 className={styles.pageTitle}>Incident not found</h2>
            <Link to="/technician" style={{ color: 'var(--blue)', marginTop: 'var(--space-3)', display: 'inline-block' }}>
              Return to queue
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Nav
        role="TECHNICIAN"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        <Link
          to="/technician"
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
          <span>Back to queue</span>
        </Link>

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

        {/* Status Strip */}
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
            <span className={styles.reference}>{incident.reference}</span>
            <StatusLabel status={incident.status as IncidentStatus} />
            <PriorityMarker priority={incident.priority as Priority} />
          </div>
          <div style={{ minWidth: '200px', flex: 1, maxWidth: '360px' }}>
            <LifecycleBar status={incident.status as IncidentStatus} />
          </div>
        </section>

        {/* Detail Layout */}
        <div className={styles.detailGrid}>
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
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

            {/* Advisory Resolution Suggestions */}
            <div className={styles.suggestionsPanel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Lightbulb size={18} weight="light" color="var(--amber)" />
                <h3 className={styles.actionCardTitle} style={{ fontSize: 'var(--fs-label)' }}>
                  Advisory suggestions
                </h3>
              </div>
              {isSuggestionsError ? (
                <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)', margin: 0 }}>
                  Suggestions unavailable.
                </p>
              ) : suggestions.length === 0 ? (
                <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-3)', margin: 0 }}>
                  No similar historical resolutions found.
                </p>
              ) : (
                suggestions.map((sug) => (
                  <div key={sug.incidentId} className={styles.suggestionCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={styles.suggestionRef}>{sug.reference}</span>
                      <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                        {Math.round(sug.confidenceScore * 100)}% match
                      </span>
                    </div>
                    <p className={styles.suggestionTitle}>{sug.title}</p>
                    <p className={styles.suggestionText}>{sug.resolutionDetails}</p>
                  </div>
                ))
              )}
            </div>

            {/* Activity Stream */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <h2 className={styles.actionCardTitle}>Activity & communication</h2>

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

              {/* Add Comment Form */}
              <div
                style={{
                  backgroundColor: 'var(--surface-1)',
                  border: '1px solid var(--line-1)',
                  borderRadius: 'var(--r-lg)',
                  padding: 'var(--space-4)',
                  marginTop: 'var(--space-3)',
                }}
              >
                <div className={styles.commentTypeSelector}>
                  <button
                    type="button"
                    className={clsx(styles.typeBtn, commentKind === 'COMMENT' && styles.typeBtnActive)}
                    onClick={() => setCommentKind('COMMENT')}
                  >
                    Public comment
                  </button>
                  <button
                    type="button"
                    className={clsx(styles.typeBtn, commentKind === 'INTERNAL_NOTE' && styles.typeBtnActive)}
                    onClick={() => setCommentKind('INTERNAL_NOTE')}
                  >
                    Internal note
                  </button>
                  <button
                    type="button"
                    className={clsx(
                      styles.typeBtn,
                      commentKind === 'INFORMATION_REQUEST' && styles.typeBtnActive
                    )}
                    onClick={() => setCommentKind('INFORMATION_REQUEST')}
                  >
                    Request info
                  </button>
                </div>

                <Textarea
                  id="tech-comment"
                  label={
                    commentKind === 'INTERNAL_NOTE'
                      ? 'Internal note (staff only)'
                      : commentKind === 'INFORMATION_REQUEST'
                      ? 'Request information from employee'
                      : 'Public comment'
                  }
                  placeholder={
                    commentKind === 'INTERNAL_NOTE'
                      ? 'Notes visible only to technicians and admins...'
                      : 'Message visible to the employee...'
                  }
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                  <Button
                    variant="primary"
                    size="compact"
                    disabled={!commentText.trim()}
                    isLoading={postCommentMutation.isPending}
                    onClick={() => postCommentMutation.mutate()}
                  >
                    Post {commentKind === 'INTERNAL_NOTE' ? 'internal note' : 'comment'}
                  </Button>
                </div>
              </div>
            </section>
          </div>

          {/* Sticky Next Action & SLA Panel */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className={styles.stickyActionCard}>
              <h3 className={styles.actionCardTitle}>Next action</h3>
              {incident.status === 'ASSIGNED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-2)', margin: 0 }}>
                    Acknowledge receipt of this assignment to confirm you are reviewing it.
                  </p>
                  <Button
                    variant="primary"
                    size="default"
                    isLoading={ackMutation.isPending}
                    onClick={() => ackMutation.mutate()}
                    style={{ width: '100%' }}
                  >
                    <CheckCircle size={18} weight="light" />
                    <span>Acknowledge</span>
                  </Button>
                </div>
              )}

              {incident.status === 'ACKNOWLEDGED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-2)', margin: 0 }}>
                    Transition to in-progress when you start actively investigating.
                  </p>
                  <Button
                    variant="primary"
                    size="default"
                    isLoading={startMutation.isPending}
                    onClick={() => startMutation.mutate()}
                    style={{ width: '100%' }}
                  >
                    <Play size={18} weight="light" />
                    <span>Start investigation</span>
                  </Button>
                </div>
              )}

              {incident.status === 'IN_PROGRESS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-2)', margin: 0 }}>
                    When work is complete, provide resolution notes and resolve the incident.
                  </p>
                  <Button
                    variant="primary"
                    size="default"
                    onClick={() => setResolveDialogOpen(true)}
                    style={{ width: '100%' }}
                  >
                    <Check size={18} weight="light" />
                    <span>Resolve incident</span>
                  </Button>
                </div>
              )}

              {incident.status === 'RESOLVED' && (
                <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-2)', margin: 0 }}>
                  This incident is currently awaiting administrator verification.
                </p>
              )}

              {incident.status === 'VERIFIED' && (
                <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--green)', margin: 0 }}>
                  Verified by administrator.
                </p>
              )}

              {incident.status === 'CLOSED' && (
                <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-3)', margin: 0 }}>
                  This incident is closed.
                </p>
              )}
            </div>

            {/* SLA Clocks */}
            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--line-1)',
                borderRadius: 'var(--r-lg)',
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <h3 className={styles.actionCardTitle} style={{ fontSize: 'var(--fs-label)' }}>
                SLA targets
              </h3>
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

            {/* History Timeline */}
            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--line-1)',
                borderRadius: 'var(--r-lg)',
                padding: 'var(--space-4)',
              }}
            >
              <h3 className={styles.actionCardTitle} style={{ fontSize: 'var(--fs-label)', marginBottom: 'var(--space-3)' }}>
                History
              </h3>
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
          </aside>
        </div>
      </main>

      {/* Resolve Dialog */}
      <Dialog
        open={resolveDialogOpen}
        onOpenChange={setResolveDialogOpen}
        title={`Resolve ${incident.reference}`}
        description="Detail what was fixed and what preventive measures were taken."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" size="compact" onClick={() => setResolveDialogOpen(false)}>
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
            id="modal-resolve-details"
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
    </div>
  );
}

