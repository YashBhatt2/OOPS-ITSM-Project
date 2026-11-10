import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { Button } from '@/components/ui/Button/Button';
import { StatusLabel } from '@/components/ui/StatusLabel/StatusLabel';
import { PriorityMarker } from '@/components/ui/PriorityMarker/PriorityMarker';
import { LifecycleBar } from '@/components/ui/LifecycleBar/LifecycleBar';
import { IncidentFilters, FilterState } from '@/components/IncidentFilters';
import { apiRequest } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import { Priority, IncidentStatus } from '@/lib/constants';
import { Incident, PagedResult, Service, Dashboard } from '@/features/employee/types';
import styles from '@/features/employee/employee.module.css';

export function AllIncidentsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    status: 'ALL',
    priority: 'ALL',
    slaStatus: 'ALL',
    serviceId: 'ALL',
    includeClosed: false,
    sort: 'updatedAt,desc',
  });

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'me'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => apiRequest('/api/v1/services'),
  });

  const serviceMap = new Map<string, string>();
  services.forEach((s) => serviceMap.set(s.id, s.name));

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('size', '20');
    params.set('sort', filters.sort);
    if (filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.priority !== 'ALL') params.set('priority', filters.priority);
    if (filters.slaStatus !== 'ALL') params.set('slaStatus', filters.slaStatus);
    if (filters.serviceId !== 'ALL') params.set('serviceId', filters.serviceId);
    if (filters.includeClosed) params.set('includeClosed', 'true');
    return params.toString();
  };

  const {
    data: incidentsResult,
    isLoading,
    isError,
  } = useQuery<PagedResult<Incident>>({
    queryKey: ['all-incidents', page, filters],
    queryFn: () => apiRequest(`/api/v1/incidents?${buildQuery()}`),
  });

  const incidents = incidentsResult?.items ?? [];
  const totalElements = incidentsResult?.totalElements ?? 0;
  const totalPages = incidentsResult?.totalPages ?? 0;

  const handleIncidentClick = (id: string) => {
    if (user?.role === 'ADMIN') {
      navigate(`/admin/incidents/${id}`);
    } else if (user?.role === 'TECHNICIAN') {
      navigate(`/technician/incidents/${id}`);
    } else {
      navigate(`/employee/incidents/${id}`);
    }
  };

  return (
    <div className={styles.page}>
      <Nav
        role={user?.role}
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 className={styles.greeting} style={{ marginBottom: 'var(--space-1)' }}>
            Incidents directory
          </h1>
          <p className={styles.subgreeting}>Filter and inspect reported IT issues and service requests.</p>
        </div>

        {/* 6+ Combinable Incident Filters */}
        <IncidentFilters
          filters={filters}
          onChange={(newFilters) => {
            setFilters(newFilters);
            setPage(0);
          }}
        />

        {isLoading ? (
          <div className={styles.cardList}>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </div>
        ) : isError ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Could not load incidents</p>
            <p className={styles.emptyDesc}>There was a problem querying the incident directory.</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No incidents match your filter</p>
            <p className={styles.emptyDesc}>Try adjusting the status, priority, or service filters above.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className={styles.cardList}>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => handleIncidentClick(inc.id)}
                  className={styles.incidentCard}
                  style={{ cursor: 'pointer' }}
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
                </div>
              ))}
            </div>

            {/* Desktop Table */}
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
                      onClick={() => handleIncidentClick(inc.id)}
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
      </main>
    </div>
  );
}
