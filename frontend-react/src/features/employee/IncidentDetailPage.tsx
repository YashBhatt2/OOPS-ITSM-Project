import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowsCounterClockwise, Star } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { BackButton } from '@/components/ui/BackButton/BackButton';
import { StatusLabel } from '@/components/ui/StatusLabel/StatusLabel';
import { PriorityMarker } from '@/components/ui/PriorityMarker/PriorityMarker';
import { LifecycleBar } from '@/components/ui/LifecycleBar/LifecycleBar';
import { SlaMeter } from '@/components/ui/SlaMeter/SlaMeter';
import { Comment } from '@/components/ui/Comment/Comment';
import { Timeline } from '@/components/ui/Timeline/Timeline';
import { Input, Textarea } from '@/components/ui/Field/Field';
import { Button } from '@/components/ui/Button/Button';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest, ApiConflictError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Priority, IncidentStatus, SlaStatus } from '@/lib/constants';
import { Incident, IncidentComment, HistoryEvent, Service, Category, Dashboard } from './types';
import styles from './employee.module.css';

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [commentText, setCommentText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
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

  // 4. Services & Categories for names
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => apiRequest('/api/v1/services'),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => apiRequest('/api/v1/categories'),
  });

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'me'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  const serviceName = services.find((s) => s.id === incident?.serviceId)?.name || 'Service';
  const categoryName = categories.find((c) => c.id === incident?.categoryId)?.name || 'General';

  // Edit while NEW
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!incident) return;
      return await apiRequest(`/api/v1/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: incident.version,
          title: editTitle.trim(),
          description: editDesc.trim(),
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Request updated.', type: 'success' });
      setIsEditing(false);
      setConflictMessage(null);
      refetchIncident();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were viewing it. We've loaded the latest version.");
        refetchIncident();
      } else {
        showToast({ title: 'Failed to update request.', type: 'error' });
      }
    },
  });

  // Add Public Comment
  const commentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/v1/incidents/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: commentText.trim(),
          kind: 'COMMENT',
          visibility: 'PUBLIC',
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Comment added.', type: 'success' });
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['incident-history', id] });
    },
    onError: () => {
      showToast({ title: 'Failed to add comment.', type: 'error' });
    },
  });

  // Reopen
  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!incident) return;
      return await apiRequest(`/api/v1/incidents/${id}/reopens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: incident.version }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Incident reopened.', type: 'success' });
      setConflictMessage(null);
      refetchIncident();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage("This incident changed while you were viewing it. We've loaded the latest version.");
        refetchIncident();
      } else {
        showToast({ title: 'Failed to reopen incident.', type: 'error' });
      }
    },
  });

  // Feedback
  const feedbackMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/v1/incidents/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: feedbackRating,
          text: feedbackComment.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Thank you for your feedback.', type: 'success' });
      setFeedbackSubmitted(true);
    },
    onError: () => {
      showToast({ title: 'Failed to submit feedback.', type: 'error' });
    },
  });

  if (isIncidentLoading) {
    return (
      <div className={styles.page}>
        <Nav role="EMPLOYEE" userDisplayName={user?.displayName} onLogout={logout} />
        <main className={styles.main}>
          <div className={styles.skeleton} style={{ height: '300px' }} />
        </main>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className={styles.page}>
        <Nav role="EMPLOYEE" userDisplayName={user?.displayName} onLogout={logout} />
        <main className={styles.main}>
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Incident not found</p>
            <p className={styles.emptyDesc}>The requested report does not exist or you do not have permission to view it.</p>
            <Link to="/employee" className={styles.backLink}>
              Return to requests
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Check if reopenable within 7 days
  const isReopenable =
    incident.status === 'CLOSED' &&
    incident.closedAt &&
    Date.now() - new Date(incident.closedAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  // Filter public comments only
  const publicComments = Array.isArray(comments)
    ? comments.filter((c) => !c.visibility || c.visibility === 'PUBLIC')
    : [];
  const historyList = Array.isArray(history) ? history : [];

  return (
    <div className={styles.page}>
      <Nav
        role="EMPLOYEE"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        <BackButton to="/employee" label="Back to requests" />

        {conflictMessage && (
          <div className={styles.conflictBanner} style={{ marginBottom: 'var(--space-4)' }}>
            <span>{conflictMessage}</span>
            <Button variant="ghost" size="compact" onClick={() => setConflictMessage(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Status Strip */}
        <section className={styles.statusStrip}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className={styles.reference}>{incident.reference}</span>
            <StatusLabel status={incident.status as IncidentStatus} />
            <PriorityMarker
              priority={(incident.effectivePriority || incident.priority || 'P3') as Priority}
            />
          </div>
          <div style={{ minWidth: '200px', flex: 1, maxWidth: '360px' }}>
            <LifecycleBar status={incident.status as IncidentStatus} />
          </div>
        </section>

        {/* Detail Layout */}
        <div className={styles.detailGrid}>
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <article className={styles.detailCard}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <Input
                    id="edit-title"
                    label="Subject"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <Textarea
                    id="edit-desc"
                    label="Description"
                    rows={6}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="compact" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="compact"
                      isLoading={editMutation.isPending}
                      onClick={() => editMutation.mutate()}
                    >
                      Save changes
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                    <div>
                      <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {serviceName} · {categoryName}
                      </span>
                      <h1 className={styles.detailTitle} style={{ marginTop: 'var(--space-1)' }}>
                        {incident.title}
                      </h1>
                    </div>
                    {incident.status === 'NEW' && (
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => {
                          setEditTitle(incident.title);
                          setEditDesc(incident.description);
                          setIsEditing(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                  <p className={styles.descriptionProse}>{incident.description}</p>
                </>
              )}
            </article>

            {/* Reopen Action (if Closed within 7 days) */}
            {isReopenable && (
              <div className={styles.sideCard} style={{ borderColor: 'var(--amber)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                  <div>
                    <h3 className={styles.sideTitle}>Is the issue persisting?</h3>
                    <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-2)', margin: 'var(--space-1) 0 0' }}>
                      You can reopen this request within 7 days of closure.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="compact"
                    isLoading={reopenMutation.isPending}
                    onClick={() => reopenMutation.mutate()}
                  >
                    <ArrowsCounterClockwise size={16} weight="light" />
                    <span>Reopen request</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Feedback Section (if Resolved or Verified) */}
            {(incident.status === 'RESOLVED' || incident.status === 'VERIFIED' || incident.status === 'CLOSED') && (
              <div className={styles.sideCard}>
                <h3 className={styles.sideTitle}>Service feedback</h3>
                {feedbackSubmitted ? (
                  <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--green)', margin: 0 }}>
                    Thank you! Your feedback has been recorded.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-2)', margin: 0 }}>
                      How satisfied are you with the resolution of this issue?
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: star <= feedbackRating ? 'var(--amber)' : 'var(--text-3)',
                            padding: 'var(--space-1)',
                          }}
                          aria-label={`${star} star`}
                        >
                          <Star size={24} weight={star <= feedbackRating ? 'fill' : 'light'} />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      id="feedback-text"
                      label="Optional comments"
                      placeholder="Share details about your experience..."
                      rows={3}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="secondary"
                        size="compact"
                        isLoading={feedbackMutation.isPending}
                        onClick={() => feedbackMutation.mutate()}
                      >
                        Submit feedback
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comments & Activity Stream */}
            <section className={styles.commentsSection}>
              <h2 className={styles.sectionTitle}>Activity and comments</h2>

              {publicComments.length === 0 ? (
                <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-3)', margin: 0 }}>
                  No comments yet.
                </p>
              ) : (
                publicComments.map((c) => (
                  <Comment
                    key={c.id}
                    id={c.id}
                    authorName={c.authorName || 'Staff'}
                    createdAt={c.createdAt}
                    body={c.body}
                    kind={c.kind === 'INFORMATION_REQUEST' ? 'INFORMATION_REQUEST' : 'PUBLIC'}
                  />
                ))
              )}

              {/* Add Comment Input */}
              {incident.status !== 'CLOSED' && (
                <div className={styles.sideCard} style={{ marginTop: 'var(--space-4)' }}>
                  <Textarea
                    id="add-comment"
                    label="Add a comment"
                    placeholder="Provide additional details or reply to requests for information..."
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                    <Button
                      variant="primary"
                      size="compact"
                      disabled={!commentText.trim()}
                      isLoading={commentMutation.isPending}
                      onClick={() => commentMutation.mutate()}
                    >
                      Post comment
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Side Column: SLA & History Timeline */}
          <aside className={styles.sidePanel}>
            {/* SLA Clocks (Only shown if at-risk or breached, or ticking down) */}
            <div className={styles.sideCard}>
              <h3 className={styles.sideTitle}>Service Level Agreements</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
            </div>

            {/* Timeline */}
            <div className={styles.sideCard}>
              <h3 className={styles.sideTitle}>Lifecycle history</h3>
              {historyList.length === 0 ? (
                <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)', margin: 0 }}>
                  No history recorded.
                </p>
              ) : (
                <Timeline
                  items={historyList.map((h) => ({
                    id: h.id,
                    title: h.event || h.action || 'Event',
                    timestamp: formatDateTime(h.createdAt),
                    description: h.details || h.description || '',
                    actor: h.actorName,
                  }))}
                />
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

