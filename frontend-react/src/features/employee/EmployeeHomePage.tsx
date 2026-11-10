import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { StatTile } from '@/components/ui/StatTile/StatTile';
import { Button } from '@/components/ui/Button/Button';
import { Plus } from '@phosphor-icons/react';

export const EmployeeHomePage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <Nav role="EMPLOYEE" userDisplayName={user?.displayName} onLogout={logout} />
      <main style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-6) var(--margin)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 className="t-serif-title" style={{ color: 'var(--text-1)', marginBottom: 'var(--space-1)' }}>
              Good morning, {user?.displayName || 'there'}.
            </h1>
            <p className="t-body-s" style={{ color: 'var(--text-2)' }}>
              Track your service requests and reported issues.
            </p>
          </div>
          <Button variant="primary" size="default">
            <Plus size={18} weight="light" />
            <span>Report an incident</span>
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
          <StatTile label="Active" value={0} />
          <StatTile label="Awaiting verification" value={0} />
          <StatTile label="Closed" value={0} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2 className="t-title-2" style={{ color: 'var(--text-1)' }}>Your incidents</h2>
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-lg)', padding: 'var(--space-8)', textAlign: 'center' }}>
            <h3 className="t-serif-title" style={{ color: 'var(--text-1)', marginBottom: 'var(--space-2)' }}>
              Nothing to report.
            </h3>
            <p className="t-body" style={{ color: 'var(--text-2)', maxWidth: '40ch', margin: '0 auto var(--space-5) auto' }}>
              When something stops working, report it here and track it to resolution.
            </p>
            <Button variant="primary" size="default">
              Report an incident
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

