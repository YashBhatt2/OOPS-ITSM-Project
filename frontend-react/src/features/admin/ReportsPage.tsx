import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { StatTile } from '@/components/ui/StatTile/StatTile';
import { apiRequest } from '@/lib/api';
import { ReportOverview, TechnicianWorkloadReport, ServiceReport, Dashboard } from './types';
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

  // Calculate SVG charts
  const maxTechResolved = Math.max(...techWorkload.map((t) => t.resolved), 1);
  const maxSrvIncidents = Math.max(...serviceReports.map((s) => s.totalIncidents), 1);

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
          <h1 className={styles.pageTitle}>Reports & Analytics</h1>
          <p className={styles.pageSub}>
            Operational performance, technician capacity metrics, and SLA breach trends.
          </p>
        </div>

        {/* Overview Stat Tiles */}
        <section className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <StatTile label="Total volume" value={overview?.totalIncidents ?? 0} />
          <StatTile label="Open incidents" value={overview?.openIncidents ?? 0} />
          <StatTile label="Resolved today" value={overview?.resolvedToday ?? 0} />
          <StatTile
            label="Avg. resolution"
            value={overview?.avgResolutionHours ? `${overview.avgResolutionHours.toFixed(1)} hrs` : '—'}
          />
          <StatTile
            label="SLA breach rate"
            value={overview?.slaBreachRate !== undefined ? `${(overview.slaBreachRate * 100).toFixed(0)}%` : '—'}
            changeDirection={overview?.slaBreachRate && overview.slaBreachRate > 0.1 ? 'bad' : 'good'}
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
            Technician throughput (resolved incidents)
          </h2>

          {techWorkload.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 'var(--fs-body-s)' }}>No workload data available.</p>
          ) : (
            <>
              {/* Hand-built Monochrome SVG Bar Chart */}
              <div style={{ width: '100%', height: '180px', marginBottom: 'var(--space-4)' }}>
                <svg
                  role="img"
                  aria-label="Technician throughput chart"
                  viewBox={`0 0 ${techWorkload.length * 100} 140`}
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <title>Technician resolved incident count</title>
                  {techWorkload.map((tech, idx) => {
                    const barHeight = (tech.resolved / maxTechResolved) * 100;
                    const x = idx * 100 + 15;
                    const y = 110 - barHeight;
                    return (
                      <g key={tech.technicianId}>
                        {/* Bar */}
                        <rect
                          x={x}
                          y={y}
                          width={70}
                          height={Math.max(barHeight, 2)}
                          rx={4}
                          fill="var(--chart-bar)"
                        />
                        {/* Value Text Above Bar */}
                        <text
                          x={x + 35}
                          y={y - 8}
                          textAnchor="middle"
                          fill="var(--text-1)"
                          fontSize="12"
                          fontFamily="var(--font-mono)"
                        >
                          {tech.resolved}
                        </text>
                        {/* Label Below Bar */}
                        <text
                          x={x + 35}
                          y={130}
                          textAnchor="middle"
                          fill="var(--text-3)"
                          fontSize="12"
                          fontFamily="var(--font-sans)"
                        >
                          {tech.name.split(' ')[0]}
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
                    <th className={styles.th}>Total resolved</th>
                    <th className={styles.th}>Avg. resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {techWorkload.map((t) => (
                    <tr key={t.technicianId}>
                      <td className={styles.td} style={{ fontWeight: 500 }}>
                        {t.name}
                      </td>
                      <td className={styles.tdMuted} style={{ fontFamily: 'var(--font-mono)' }}>
                        {t.activeWorkload} / {t.capacity}
                      </td>
                      <td className={styles.td} style={{ fontFamily: 'var(--font-mono)' }}>
                        {t.resolved}
                      </td>
                      <td className={styles.tdMuted} style={{ fontFamily: 'var(--font-mono)' }}>
                        {t.avgResolutionHours ? `${t.avgResolutionHours.toFixed(1)} hrs` : '—'}
                      </td>
                    </tr>
                  ))}
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
            Service demand & SLA breach rates
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
                    const barHeight = (srv.totalIncidents / maxSrvIncidents) * 100;
                    const x = idx * 120 + 20;
                    const y = 110 - barHeight;
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
                          {srv.totalIncidents}
                        </text>
                        <text
                          x={x + 40}
                          y={130}
                          textAnchor="middle"
                          fill="var(--text-3)"
                          fontSize="12"
                          fontFamily="var(--font-sans)"
                        >
                          {srv.name.slice(0, 10)}
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
                    <th className={styles.th}>Currently open</th>
                    <th className={styles.th}>SLA breach rate</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceReports.map((s) => (
                    <tr key={s.serviceId}>
                      <td className={styles.td} style={{ fontWeight: 500 }}>
                        {s.name}
                      </td>
                      <td className={styles.td} style={{ fontFamily: 'var(--font-mono)' }}>
                        {s.totalIncidents}
                      </td>
                      <td className={styles.tdMuted} style={{ fontFamily: 'var(--font-mono)' }}>
                        {s.openIncidents}
                      </td>
                      <td className={styles.tdMuted} style={{ fontFamily: 'var(--font-mono)' }}>
                        {(s.breachRate * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

