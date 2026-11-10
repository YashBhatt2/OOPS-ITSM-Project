import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { StatTile } from '@/components/ui/StatTile/StatTile';

export const AdminOverviewPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <Nav role="ADMIN" userDisplayName={user?.displayName} onLogout={logout} />
      <main style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-6) var(--margin)' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 className="t-title-1" style={{ color: 'var(--text-1)', marginBottom: 'var(--space-1)' }}>
            Service Desk overview
          </h1>
          <p className="t-body-s" style={{ color: 'var(--text-2)' }}>
            System activity, incident dispatch, and SLA performance.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
          <StatTile label="New and unassigned" value={0} />
          <StatTile label="Awaiting verification" value={0} />
          <StatTile label="At risk" value={0} />
          <StatTile label="Breached" value={0} />
        </div>

        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-8)', textAlign: 'center' }}>
          <h2 className="t-serif-title" style={{ color: 'var(--text-1)', marginBottom: 'var(--space-2)' }}>
            Unassigned queue clear.
          </h2>
          <p className="t-body" style={{ color: 'var(--text-2)', maxWidth: '40ch', margin: '0 auto' }}>
            There are no unassigned incidents waiting for dispatch right now.
          </p>
        </div>
      </main>
    </div>
  );
};

