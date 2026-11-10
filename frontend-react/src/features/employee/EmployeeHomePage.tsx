import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { StatTile } from '@/components/ui/StatTile/StatTile';
import { Button } from '@/components/ui/Button/Button';
import { StatusLabel } from '@/components/ui/StatusLabel/StatusLabel';
import { PriorityMarker } from '@/components/ui/PriorityMarker/PriorityMarker';
import { LifecycleBar } from '@/components/ui/LifecycleBar/LifecycleBar';
import { apiRequest } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import { Priority, IncidentStatus } from '@/lib/constants';
import { Incident, Dashboard, PagedResult, Service } from './types';
import styles from './employee.module.css';

export function EmployeeHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [includeClosed, setIncludeClosed] = useState(false);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'there';

  // 1. Dashboard summary
  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'me'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  // 2. Services list (for resolving serviceId -> name)
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => apiRequest('/api/v1/services'),
  });

  const serviceMap = new Map<string, string>();
  services.forEach((s) => serviceMap.set(s.id, s.name));

  // 3. User's reported incidents
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('size', '20');
    params.set('sort', 'updatedAt,desc');
    if (statusFilter !== 'ALL') {
      params.set('status', statusFilter);
    }
    if (includeClosed) {
      params.set('includeClosed', 'true');
    }
    return params.toString();
  };

  const {
    data: incidentsResult,
    isLoading,
    isError,
  } = useQuery<PagedResult<Incident>>({
    queryKey: ['employee-incidents', page, statusFilter, includeClosed],
    queryFn: () => apiRequest(`/api/v1/incidents?${buildQuery()}`),
  });

  const incidents = incidentsResult?.items ?? [];
  const totalElements = incidentsResult?.totalElements ?? 0;
  const totalPages = incidentsResult?.totalPages ?? 0;

  // Active incidents = total - CLOSED (or from byStatus)
  const activeCount =
    (dashboard?.byStatus?.NEW ?? 0) +
    (dashboard?.byStatus?.ASSIGNED ?? 0) +
    (dashboard?.byStatus?.ACKNOWLEDGED ?? 0) +
    (dashboard?.byStatus?.IN_PROGRESS ?? 0) +
    (dashboard?.byStatus?.RESOLVED ?? 0);

  const awaitingFeedbackCount =
    (dashboard?.byStatus?.RESOLVED ?? 0) + (dashboard?.byStatus?.VERIFIED ?? 0);
  const closedCount = dashboard?.byStatus?.CLOSED ?? 0;

  return (
    <div className={styles.page}>
      <Nav
        role="EMPLOYEE"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        {/* Hero Greeting Row */}
        <section className={styles.heroRow}>
          <div className={styles.greetingBlock}>
            <h1 className={styles.greeting}>
              {getGreeting()}, {firstName}.
            </h1>
            <p className={styles.subgreeting}>Here is the status of your reported requests.</p>
          </div>
          <div className={styles.actions}>
            <Button
              variant="primary"
              size="default"
              onClick={() => navigate('/employee/report')}
            >
              <Plus size={18} weight="light" />
              <span>Report an incident</span>
            </Button>
          </div>
        </section>

        {/* Stat Tiles */}
        <section className={styles.statsGrid}>
          <StatTile label="Active requests" value={activeCount} />
          <StatTile label="Awaiting feedback" value={awaitingFeedbackCount} />
          <StatTile label="Resolved and closed" value={closedCount} />
        </section>

        {/* Incidents Section */}
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your incidents</h2>
            <div className={styles.filterBar}>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                aria-label="Filter by status"
              >
                <option value="ALL">All statuses</option>
                <option value="NEW">New</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="VERIFIED">Verified</option>
                <option value="CLOSED">Closed</option>
              </select>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={includeClosed}
                  onChange={(e) => {
                    setIncludeClosed(e.target.checked);
                    setPage(0);
                  }}
                />
                <span>Include closed</span>
              </label>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.cardList}>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
          ) : isError ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Could not load incidents</p>
              <p className={styles.emptyDesc}>There was a problem fetching your reports. Please try again.</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>You haven't reported anything yet</p>
              <p className={styles.emptyDesc}>
                When you experience an issue or request an IT service, report it here and we'll track it to resolution.
              </p>
              <Button
                variant="primary"
                size="default"
                onClick={() => navigate('/employee/report')}
              >
                <Plus size={18} weight="light" />
                <span>Report an incident</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className={styles.cardList}>
                {incidents.map((inc) => (
                  <Link
                    key={inc.id}
                    to={`/employee/incidents/${inc.id}`}
                    className={styles.incidentCard}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.reference}>{inc.reference}</span>
                      <PriorityMarker priority={inc.priority as Priority} />
                    </div>
                    <p className={styles.cardTitle}>{inc.title}</p>
                    <LifecycleBar status={inc.status as IncidentStatus} />
                    <div className={styles.cardBottom}>
                      <StatusLabel status={inc.status as IncidentStatus} />
                      <span>{serviceMap.get(inc.serviceId) || 'Service'}</span>
                      <span>{formatRelativeTime(inc.updatedAt || inc.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Reference</th>
                      <th className={styles.th}>Priority</th>
                      <th className={styles.th}>Title</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Lifecycle</th>
                      <th className={styles.th}>Service</th>
                      <th className={styles.th}>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc) => (
                      <tr
                        key={inc.id}
                        className={styles.tr}
                        onClick={() => navigate(`/employee/incidents/${inc.id}`)}
                      >
                        <td className={styles.td}>
                          <span className={styles.reference}>{inc.reference}</span>
                        </td>
                        <td className={styles.td}>
                          <PriorityMarker priority={inc.priority as Priority} />
                        </td>
                        <td className={styles.td}>{inc.title}</td>
                        <td className={styles.td}>
                          <StatusLabel status={inc.status as IncidentStatus} />
                        </td>
                        <td className={styles.td} style={{ minWidth: '130px' }}>
                          <LifecycleBar status={inc.status as IncidentStatus} />
                        </td>
                        <td className={styles.tdMuted}>
                          {serviceMap.get(inc.serviceId) || '—'}
                        </td>
                        <td className={styles.tdMuted}>
                          {formatRelativeTime(inc.updatedAt || inc.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <span className={styles.pageInfo}>
                    Showing {page * 20 + 1}–{Math.min((page + 1) * 20, totalElements)} of{' '}
                    {totalElements}
                  </span>
                  <div className={styles.pageButtons}>
                    <Button
                      variant="ghost"
                      size="compact"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <CaretLeft size={16} weight="light" />
                      <span>Previous</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="compact"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <span>Next</span>
                      <CaretRight size={16} weight="light" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
