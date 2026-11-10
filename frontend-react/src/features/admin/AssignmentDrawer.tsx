import { useState, useCallback } from 'react';
import { X } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Segmented } from '@/components/ui/Segmented/Segmented';
import { Button } from '@/components/ui/Button/Button';
import { Dialog } from '@/components/ui/Dialog/Dialog';
import { Textarea } from '@/components/ui/Field/Field';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest, ApiConflictError } from '@/lib/api';
import { AssignmentCandidate, AssignmentRecommendationsResponse, Technician } from './types';
import styles from './AssignmentDrawer.module.css';

type Strategy = 'SKILL_FIRST' | 'LOAD_FIRST';

interface Props {
  incidentId: string;
  incidentVersion: number;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignmentDrawer({ incidentId, incidentVersion, onClose, onAssigned }: Props) {
  const { showToast } = useToast();
  const [strategy, setStrategy] = useState<Strategy>('SKILL_FIRST');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<AssignmentCandidate | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [conflictMessage, setConflictMessage] = useState('');

  // Load saved strategy on mount
  useQuery({
    queryKey: ['assignment-settings'],
    queryFn: async () => {
      const data = await apiRequest<{ strategy: Strategy }>('/api/v1/admin/assignment-settings');
      if (data?.strategy) setStrategy(data.strategy);
      return data;
    },
  });

  // Load technicians to map IDs to display names
  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ['admin-technicians'],
    queryFn: () => apiRequest('/api/v1/admin/technicians'),
  });

  const techMap = new Map<string, Technician>();
  technicians.forEach((t) => techMap.set(t.id, t));

  const recommendationsQuery = useQuery<AssignmentRecommendationsResponse>({
    queryKey: ['recommendations', incidentId, strategy],
    queryFn: () =>
      apiRequest(`/api/v1/incidents/${incidentId}/assignment-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      }),
    enabled: Boolean(incidentId),
  });

  const assignMutation = useMutation({
    mutationFn: (vars: { technicianId: string; name: string; reason: string }) =>
      apiRequest(`/api/v1/incidents/${incidentId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: recommendationsQuery.data?.incidentVersion ?? incidentVersion,
          technicianId: vars.technicianId,
          strategy,
          reason: vars.reason,
        }),
      }),
    onSuccess: (_data, vars) => {
      showToast({ title: `Assigned to ${vars.name}.`, type: 'success' });
      setConfirmOpen(false);
      onAssigned();
    },
    onError: (err: unknown) => {
      if (err instanceof ApiConflictError) {
        setConflictMessage(err.message || 'This incident was updated by someone else. Please close and retry.');
      } else {
        showToast({ title: 'Assignment failed. Please check inputs and retry.', type: 'error' });
      }
    },
  });

  const handleAssignClick = (candidate: AssignmentCandidate) => {
    setSelectedCandidate(candidate);
    setReason('');
    setReasonError('');
    setConflictMessage('');
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!reason.trim()) {
      setReasonError('A reason is required.');
      return;
    }
    if (!selectedCandidate) return;
    assignMutation.mutate({
      technicianId: selectedCandidate.technicianId,
      name: selectedCandidate.name || 'Technician',
      reason: reason.trim(),
    });
  };

  const handleStrategyChange = useCallback((v: Strategy) => {
    setStrategy(v);
  }, []);

  const candidates: AssignmentCandidate[] = (recommendationsQuery.data?.candidates ?? []).map((c) => ({
    ...c,
    name: techMap.get(c.technicianId)?.displayName || c.displayName || c.name || 'Technician',
  }));

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Assign incident"
        className={styles.drawer}
      >
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Assign incident</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close drawer">
            <X size={20} weight="light" />
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.strategySection}>
            <p className={styles.sectionLabel}>Strategy</p>
            <Segmented
              name="Assignment strategy"
              options={[
                { value: 'SKILL_FIRST' as Strategy, label: 'Skill-first' },
                { value: 'LOAD_FIRST' as Strategy, label: 'Load-first' },
              ]}
              value={strategy}
              onChange={handleStrategyChange}
            />
          </div>

          {recommendationsQuery.isLoading ? (
            <div className={styles.loadingState}>Loading candidates…</div>
          ) : candidates.length === 0 ? (
            <div className={styles.emptyState}>
              No one is eligible right now. Check availability, capacity, and skills.
            </div>
          ) : (
            <div className={styles.candidateList}>
              <p className={styles.sectionLabel}>Candidates</p>
              {candidates.map((candidate) => {
                const fillPct = candidate.capacity > 0
                  ? Math.min(100, (candidate.activeWorkload / candidate.capacity) * 100)
                  : 0;
                const isHigh = fillPct >= 80;
                return (
                  <div key={candidate.technicianId} className={styles.candidateCard}>
                    <div className={styles.candidateTop}>
                      <span className={styles.candidateRank}>#{candidate.rank}</span>
                      <span className={styles.candidateName}>{candidate.name}</span>
                      <Button
                        variant="primary"
                        size="compact"
                        onClick={() => handleAssignClick(candidate)}
                      >
                        Assign
                      </Button>
                    </div>
                    <div className={styles.capacityBar}>
                      <div
                        className={clsx(styles.capacityFill, isHigh && styles.capacityFillHigh)}
                        style={{ width: `${fillPct}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <p className={styles.capacityLabel}>
                      {candidate.activeWorkload} of {candidate.capacity} active
                    </p>
                    {candidate.reasons.length > 0 && (
                      <ul className={styles.reasonsList} aria-label="Reasons for recommendation">
                        {candidate.reasons.map((r, i) => (
                          <li key={i} className={styles.reasonItem}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(false);
        }}
        title={`Assign to ${selectedCandidate?.name ?? ''}?`}
        description="Provide a brief reason for this assignment."
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              isLoading={assignMutation.isPending}
            >
              Confirm assignment
            </Button>
          </>
        }
      >
        <div className={styles.confirmReasonField}>
          <Textarea
            id="assign-reason"
            label="Reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim()) setReasonError('');
            }}
            error={reasonError}
            rows={3}
            placeholder="e.g. Best skill match for this category."
          />
          {conflictMessage && (
            <p role="alert" style={{ color: 'var(--red)', fontSize: 'var(--fs-body-s)', marginTop: 'var(--space-2)' }}>
              {conflictMessage}
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}
