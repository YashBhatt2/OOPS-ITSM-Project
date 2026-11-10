import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserPlus, Prohibit } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select } from '@/components/ui/Field/Field';
import { Dialog } from '@/components/ui/Dialog/Dialog';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest } from '@/lib/api';
import { AdminUser, Dashboard } from '../types';
import { SetupNav } from './SetupNav';
import styles from './setup.module.css';

export function UsersSetupPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [provisionOpen, setProvisionOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'TECHNICIAN' | 'ADMIN'>('TECHNICIAN');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [formError, setFormError] = useState('');

  const [deactivatingUser, setDeactivatingUser] = useState<AdminUser | null>(null);

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  const { data: users = [], refetch } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => apiRequest('/api/v1/admin/users'),
  });

  // Provision user mutation
  const provisionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: `User ${displayName} provisioned.`, type: 'success' });
      setProvisionOpen(false);
      setDisplayName('');
      setEmail('');
      setPassword('');
      setFormError('');
      refetch();
    },
    onError: () => {
      showToast({ title: 'Failed to provision user. Check email uniqueness.', type: 'error' });
    },
  });

  // Deactivate user mutation
  const deactivateMutation = useMutation({
    mutationFn: async (u: AdminUser) => {
      return await apiRequest(`/api/v1/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'User account deactivated.', type: 'success' });
      setDeactivatingUser(null);
      refetch();
    },
    onError: () => {
      showToast({ title: 'Failed to deactivate user.', type: 'error' });
    },
  });

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    return true;
  });

  return (
    <div className={styles.setupPage}>
      <Nav
        role="ADMIN"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h1 className={styles.paneTitle} style={{ fontSize: 'var(--fs-title-1)' }}>
            System setup
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 'var(--fs-body)', margin: 'var(--space-1) 0 0' }}>
            User provisioning, role assignments, and account deactivation.
          </p>
        </div>

        <SetupNav />

        <div style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
          <div
            style={{
              padding: 'var(--space-4)',
              borderBottom: '1px solid var(--line-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <h2 className={styles.paneTitle}>User accounts</h2>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  height: '2.25rem',
                  padding: '0 var(--space-2)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--line-2)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text-1)',
                  fontSize: 'var(--fs-meta)',
                }}
              >
                <option value="ALL">All roles</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="TECHNICIAN">Technician</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            <Button variant="primary" size="compact" onClick={() => setProvisionOpen(true)}>
              <UserPlus size={16} weight="light" />
              <span>Provision staff</span>
            </Button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th className={styles.slaTh}>Name</th>
                <th className={styles.slaTh}>Email</th>
                <th className={styles.slaTh}>Role</th>
                <th className={styles.slaTh}>Status</th>
                <th className={styles.slaTh} style={{ textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td className={styles.slaTd} style={{ fontWeight: 500, color: 'var(--text-1)' }}>
                    {u.displayName}
                  </td>
                  <td className={styles.slaTd} style={{ color: 'var(--text-2)' }}>
                    {u.email}
                  </td>
                  <td className={styles.slaTd}>
                    <span
                      style={{
                        fontSize: 'var(--fs-meta)',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-2)',
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className={styles.slaTd}>
                    <span
                      style={{
                        fontSize: 'var(--fs-meta)',
                        color: u.active ? 'var(--green)' : 'var(--text-3)',
                      }}
                    >
                      {u.active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className={styles.slaTd} style={{ textAlign: 'right' }}>
                    {u.active && u.id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="compact"
                        onClick={() => setDeactivatingUser(u)}
                        title="Deactivate user"
                      >
                        <Prohibit size={14} weight="light" />
                        <span>Deactivate</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Provision User Dialog */}
      <Dialog
        open={provisionOpen}
        onOpenChange={setProvisionOpen}
        title="Provision staff user"
        description="Create a technician or administrator account with immediate system access."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" size="compact" onClick={() => setProvisionOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="compact"
              isLoading={provisionMutation.isPending}
              onClick={() => {
                if (!displayName.trim() || !email.trim() || !password) {
                  setFormError('All fields are required.');
                  return;
                }
                provisionMutation.mutate();
              }}
            >
              Provision user
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          {formError && (
            <p style={{ color: 'var(--red)', fontSize: 'var(--fs-body-s)', margin: 0 }}>{formError}</p>
          )}
          <Input
            id="user-name"
            label="Full name"
            placeholder="e.g. John Doe"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <Input
            id="user-email"
            label="Email address"
            type="email"
            placeholder="john@example.test"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="user-pass"
            label="Initial password"
            type="password"
            placeholder="16+ characters..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Select
            id="user-role"
            label="Role"
            options={[
              { value: 'TECHNICIAN', label: 'Technician' },
              { value: 'ADMIN', label: 'Administrator' },
            ]}
            value={role}
            onChange={(e) => setRole(e.target.value as 'TECHNICIAN' | 'ADMIN')}
          />
        </div>
      </Dialog>

      {/* Deactivate Confirm Dialog */}
      {deactivatingUser && (
        <Dialog
          open={Boolean(deactivatingUser)}
          onOpenChange={(open) => {
            if (!open) setDeactivatingUser(null);
          }}
          title={`Deactivate ${deactivatingUser.displayName}`}
          description="This user will be immediately signed out and prevented from signing in again."
          actions={
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="ghost" size="compact" onClick={() => setDeactivatingUser(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="compact"
                isLoading={deactivateMutation.isPending}
                onClick={() => deactivateMutation.mutate(deactivatingUser)}
              >
                Confirm deactivation
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}

