import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { BackButton } from '@/components/ui/BackButton/BackButton';
import { StatTile } from '@/components/ui/StatTile/StatTile';
import { apiRequest } from '@/lib/api';
import { ReportOverview, TechnicianWorkloadReport, ServiceReport, Service, Dashboard } from './types';
import styles from './admin.module.css';

export function ReportsPage() {
  const { user, logout } = useAuth();

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  const { data: overview } = useQuery<ReportOverview>({
    queryKey: ['reports-overview'],
    queryFn: () => apiRequest('/api/v1/reports/overview'),
  });

  const { data: techWorkload = [] } = useQuery<TechnicianWorkloadReport[]>({
    queryKey: ['reports-technician-workload'],
    queryFn: () => apiRequest('/api/v1/reports/technician-workload'),
  });

  const { data: serviceReports = [] } = useQuery<ServiceReport[]>({
    queryKey: ['reports-services'],
    queryFn: () => apiRequest('/api/v1/reports/services'),
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => apiRequest('/api/v1/services'),
  });

  const serviceMap = new Map<string, string>();
  services.forEach((s) => serviceMap.set(s.id, s.name));

  // Compute overview metrics
  const totalVolume = overview?.total ?? 0;
  const byStatusList = overview?.byStatus ?? [];
  const statusMap = new Map<string, number>();
  byStatusList.forEach((s) => statusMap.set(s.status, s.count));

  const openCount = ['NEW', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_INFO']
    .reduce((acc, st) => acc + (statusMap.get(st) || 0), 0);
  const resolvedCount = ['RESOLVED', 'VERIFIED', 'CLOSED']
    .reduce((acc, st) => acc + (statusMap.get(st) || 0), 0);
  const breachCount = overview?.historicallyBreachedIncidents ?? 0;
  const breachRate = totalVolume > 0 ? breachCount / totalVolume : 0;

  // Calculate SVG charts
  const maxTechWorkload = Math.max(...techWorkload.map((t) => t.activeWorkload || 0), 1);
  const maxSrvCount = Math.max(...serviceReports.map((s) => s.count || 0), 1);

  return (
    <div className={styles.page}>
      <Nav
        role="ADMIN"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        <BackButton to="/admin" label="Back to overview" />

        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Reports & Analytics</h1>
          <p className={styles.pageSub}>
            Operational performance, technician capacity metrics, and SLA breach trends.
          </p>
        </div>

        {/* Overview Stat Tiles */}
        <section className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <StatTile label="Total volume" value={totalVolume} />
          <StatTile label="Open incidents" value={openCount} />
          <StatTile label="Resolved" value={resolvedCount} />
          <StatTile
            label="Historical breaches"
            value={breachCount}
            changeDirection={breachCount > 0 ? 'bad' : 'good'}
          />
          <StatTile
            label="SLA breach rate"
            value={`${(breachRate * 100).toFixed(0)}%`}
            changeDirection={breachRate > 0.1 ? 'bad' : 'good'}
          />
        </section>

        {/* Technician Workload SVG Chart & Table */}
        <section
          style={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--line-1)',
            borderRadius: 'var(--r-xl)',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <h2 className={styles.sectionTitle} style={{ marginBottom: 'var(--space-4)' }}>
            Technician active workload & capacity
          </h2>

          {techWorkload.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 'var(--fs-body-s)' }}>No workload data available.</p>
          ) : (
            <>
              {/* Hand-built Monochrome SVG Bar Chart */}
              <div style={{ width: '100%', height: '180px', marginBottom: 'var(--space-4)' }}>
                <svg
                  role="img"
                  aria-label="Technician workload chart"
                  viewBox={`0 0 ${techWorkload.length * 120} 140`}
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <title>Technician active incident count</title>
                  {techWorkload.map((tech, idx) => {
                    const barHeight = ((tech.activeWorkload || 0) / maxTechWorkload) * 100;
                    const x = idx * 120 + 20;
                    const y = 110 - barHeight;
                    const name = tech.displayName || tech.name || 'Technician';
                    return (
                      <g key={tech.technicianId}>
                        <rect
                          x={x}
                          y={y}
                          width={80}
                          height={Math.max(barHeight, 2)}
                          rx={4}
                          fill="var(--chart-bar)"
                        />
                        <text
                          x={x + 40}
                          y={y - 8}
                          textAnchor="middle"
                          fill="var(--text-1)"
                          fontSize="12"
                          fontFamily="var(--font-mono)"
                        >
                          {tech.activeWorkload} / {tech.capacity}
                        </text>
                        <text
                          x={x + 40}
                          y={130}
                          textAnchor="middle"
                          fill="var(--text-3)"
                          fontSize="12"
                          fontFamily="var(--font-sans)"
                        >
                          {name.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Text Fallback / Detailed Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: 'var(--space-4)' }}>
                <thead>
                  <tr>
                    <th className={styles.th}>Technician</th>
                    <th className={styles.th}>Active load</th>
                    <th className={styles.th}>Capacity</th>
                    <th className={styles.th}>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {techWorkload.map((t) => {
                    const name = t.displayName || t.name || 'Technician';
                    const util = t.capacity > 0 ? ((t.activeWorkload / t.capacity) * 100).toFixed(0) : '0';
                    return (
                      <tr key={t.technicianId}>
                        <td className={styles.td} style={{ fontWeight: 500 }}>
                          {name}
                        </td>
                        <td className={styles.td} style={{ fontFamily: 'var(--font-mono)' }}>
                          {t.activeWorkload}
                        </td>
                        <td className={styles.tdMuted} style={{ fontFamily: 'var(--font-mono)' }}>
                          {t.capacity}
                        </td>
                        <td className={styles.tdMuted} style={{ fontFamily: 'var(--font-mono)' }}>
                          {util}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </section>

        {/* Services Demand SVG Chart & Table */}
        <section
          style={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--line-1)',
            borderRadius: 'var(--r-xl)',
            padding: 'var(--space-6)',
          }}
        >
          <h2 className={styles.sectionTitle} style={{ marginBottom: 'var(--space-4)' }}>
            Service demand
          </h2>

          {serviceReports.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 'var(--fs-body-s)' }}>No service metrics available.</p>
          ) : (
            <>
              {/* Hand-built Monochrome SVG Bar Chart */}
              <div style={{ width: '100%', height: '180px', marginBottom: 'var(--space-4)' }}>
                <svg
                  role="img"
                  aria-label="Service demand chart"
                  viewBox={`0 0 ${serviceReports.length * 120} 140`}
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <title>Incidents by service</title>
                  {serviceReports.map((srv, idx) => {
                    const count = srv.count ?? srv.totalIncidents ?? 0;
                    const barHeight = (count / maxSrvCount) * 100;
                    const x = idx * 120 + 20;
                    const y = 110 - barHeight;
                    const sName = serviceMap.get(srv.serviceId) || srv.name || 'Service';
                    return (
                      <g key={srv.serviceId}>
                        <rect
                          x={x}
                          y={y}
                          width={80}
                          height={Math.max(barHeight, 2)}
                          rx={4}
                          fill="var(--chart-bar)"
                        />
                        <text
                          x={x + 40}
                          y={y - 8}
                          textAnchor="middle"
                          fill="var(--text-1)"
                          fontSize="12"
                          fontFamily="var(--font-mono)"
                        >
                          {count}
                        </text>
                        <text
                          x={x + 40}
                          y={130}
                          textAnchor="middle"
                          fill="var(--text-3)"
                          fontSize="12"
                          fontFamily="var(--font-sans)"
                        >
                          {sName.slice(0, 10)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Text Fallback / Detailed Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: 'var(--space-4)' }}>
                <thead>
                  <tr>
                    <th className={styles.th}>Service</th>
                    <th className={styles.th}>Total requests</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceReports.map((s) => {
                    const count = s.count ?? s.totalIncidents ?? 0;
                    const sName = serviceMap.get(s.serviceId) || s.name || 'Service';
                    return (
                      <tr key={s.serviceId}>
                        <td className={styles.td} style={{ fontWeight: 500 }}>
                          {sName}
                        </td>
                        <td className={styles.td} style={{ fontFamily: 'var(--font-mono)' }}>
                          {count}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

