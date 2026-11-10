import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Queue, CheckCircle, ChartBar, Gear } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { StatTile } from '@/components/ui/StatTile/StatTile';
import { Button } from '@/components/ui/Button/Button';
import { PriorityMarker } from '@/components/ui/PriorityMarker/PriorityMarker';
import { apiRequest } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import { Priority } from '@/lib/constants';
import { Dashboard, Incident, PagedResult } from './types';
import { AssignmentDrawer } from './AssignmentDrawer';
import { useState } from 'react';
import styles from './admin.module.css';

export function AdminOverviewPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [assigningIncident, setAssigningIncident] = useState<Incident | null>(null);

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  const { data: unassignedResult, refetch: refetchUnassigned } = useQuery<PagedResult<Incident>>({
    queryKey: ['incidents', 'unassigned'],
    queryFn: () => apiRequest('/api/v1/incidents?status=NEW&page=0&size=10'),
  });

  const { data: atRiskResult } = useQuery<PagedResult<Incident>>({
    queryKey: ['incidents', 'atRisk'],
    queryFn: () => apiRequest('/api/v1/incidents?slaStatus=AT_RISK&page=0&size=1'),
  });

  const { data: breachedResult } = useQuery<PagedResult<Incident>>({
    queryKey: ['incidents', 'breached'],
    queryFn: () => apiRequest('/api/v1/incidents?slaStatus=BREACHED&page=0&size=1'),
  });

  const unassigned = unassignedResult?.items ?? [];

  return (
    <div className={styles.page}>
      <Nav
        role="ADMIN"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Overview</h1>
          <p className={styles.pageSub}>Incident dispatch, SLA performance, and system status.</p>
        </div>

        <div className={styles.statsGrid}>
          <StatTile
            label="New unassigned"
            value={dashboard?.byStatus?.NEW ?? 0}
          />
          <StatTile
            label="Awaiting verification"
            value={dashboard?.byStatus?.RESOLVED ?? 0}
          />
          <StatTile
            label="At risk"
            value={atRiskResult?.totalElements ?? 0}
            changeDirection={atRiskResult?.totalElements ? 'bad' : 'neutral'}
          />
          <StatTile
            label="Breached"
            value={breachedResult?.totalElements ?? 0}
            changeDirection={breachedResult?.totalElements ? 'bad' : 'neutral'}
          />
        </div>

        <div className={styles.queuePanel}>
          <div className={styles.sectionHeader} style={{ padding: 'var(--space-3) var(--space-4)' }}>
            <h2 className={styles.sectionTitle}>Unassigned queue</h2>
          </div>
          {unassigned.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Queue clear</p>
              <p className={styles.emptyText}>There are no unassigned incidents waiting for dispatch.</p>
            </div>
          ) : (
            unassigned.map((incident) => (
              <div
                key={incident.id}
                className={styles.incidentRow}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/admin/incidents/${incident.id}`)}
              >
                <span className={styles.incidentRef}>{incident.reference}</span>
                <PriorityMarker
                  priority={(incident.effectivePriority || incident.priority || 'P3') as Priority}
                />
                <span className={styles.incidentTitle}>{incident.title}</span>
                <div className={styles.incidentMeta} onClick={(e) => e.stopPropagation()}>
                  <span className={styles.incidentAge}>{formatRelativeTime(incident.createdAt)}</span>
                  <Button
                    variant="secondary"
                    size="compact"
                    className={styles.assignBtn}
                    onClick={() => setAssigningIncident(incident)}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.quickLinks}>
          <Link to="/admin/verification" className={styles.quickLink}>
            <CheckCircle size={18} weight="light" />
            Verification queue
          </Link>
          <Link to="/admin/reports" className={styles.quickLink}>
            <ChartBar size={18} weight="light" />
            Reports
          </Link>
          <Link to="/admin/setup" className={styles.quickLink}>
            <Gear size={18} weight="light" />
            Setup
          </Link>
          <Link to="/incidents" className={styles.quickLink}>
            <Queue size={18} weight="light" />
            All incidents
          </Link>
        </div>
      </main>

      {assigningIncident && (
        <AssignmentDrawer
          incidentId={assigningIncident.id}
          incidentVersion={assigningIncident.version}
          onClose={() => setAssigningIncident(null)}
          onAssigned={() => {
            setAssigningIncident(null);
            refetchUnassigned();
          }}
        />
      )}
    </div>
  );
}
