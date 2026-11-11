import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { Button } from '@/components/ui/Button/Button';
import { Input, Textarea, Select } from '@/components/ui/Field/Field';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest } from '@/lib/api';
import { Service, Dashboard } from '../types';
import { SetupNav } from './SetupNav';
import { BackButton } from '@/components/ui/BackButton/BackButton';
import styles from './setup.module.css';

interface SlaTarget {
  responseSeconds: number;
  resolutionSeconds: number;
}

interface SlaPolicyPayload {
  targets: Record<string, SlaTarget>;
}

export function ServicesSetupPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criticality, setCriticality] = useState(1);
  const [active, setActive] = useState(true);
  const [nameError, setNameError] = useState('');

  // SLA Targets State (in seconds)
  const [slaTargets, setSlaTargets] = useState<Record<string, SlaTarget>>({
    P1: { responseSeconds: 900, resolutionSeconds: 14400 },
    P2: { responseSeconds: 3600, resolutionSeconds: 28800 },
    P3: { responseSeconds: 14400, resolutionSeconds: 86400 },
    P4: { responseSeconds: 28800, resolutionSeconds: 172800 },
  });

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  const { data: services = [], refetch } = useQuery<Service[]>({
    queryKey: ['admin-services'],
    queryFn: () => apiRequest('/api/v1/services'),
  });

  // Fetch SLA policy when service selected
  const { data: slaData } = useQuery<SlaPolicyPayload>({
    queryKey: ['sla-policy', selectedService?.id],
    queryFn: () => apiRequest(`/api/v1/admin/services/${selectedService!.id}/sla-policies`),
    enabled: Boolean(selectedService?.id),
  });

  useEffect(() => {
    if (slaData?.targets) {
      setSlaTargets(slaData.targets);
    }
  }, [slaData]);

  const saveServiceMutation = useMutation({
    mutationFn: async () => {
      if (isCreating) {
        return await apiRequest('/api/v1/admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            criticality,
            active,
          }),
        });
      } else if (selectedService) {
        return await apiRequest(`/api/v1/admin/services/${selectedService.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            criticality,
            active,
          }),
        });
      }
    },
    onSuccess: () => {
      showToast({ title: isCreating ? 'Service created.' : 'Service updated.', type: 'success' });
      setIsCreating(false);
      refetch();
    },
    onError: () => {
      showToast({ title: 'Failed to save service.', type: 'error' });
    },
  });

  const saveSlaMutation = useMutation({
    mutationFn: async () => {
      if (!selectedService) return;
      return await apiRequest(`/api/v1/admin/services/${selectedService.id}/sla-policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: slaTargets }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'SLA policy targets saved.', type: 'success' });
    },
    onError: () => {
      showToast({ title: 'Failed to update SLA policy.', type: 'error' });
    },
  });

  const handleSelect = (service: Service) => {
    setSelectedService(service);
    setIsCreating(false);
    setName(service.name);
    setDescription(service.description || '');
    setCriticality(service.criticality);
    setActive(service.active);
    setNameError('');
  };

  const handleStartCreate = () => {
    setSelectedService(null);
    setIsCreating(true);
    setName('');
    setDescription('');
    setCriticality(1);
    setActive(true);
    setNameError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Service name is required.');
      return;
    }
    setNameError('');
    saveServiceMutation.mutate();
  };

  return (
    <div className={styles.setupPage}>
      <Nav
        role="ADMIN"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        <BackButton to="/admin" label="Back to overview" />
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h1 className={styles.paneTitle} style={{ fontSize: 'var(--fs-title-1)' }}>
            System setup
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 'var(--fs-body)', margin: 'var(--space-1) 0 0' }}>
            Manage IT services, service criticality tiers, and target response/resolution SLA policies.
          </p>
        </div>

        <SetupNav />

        <div className={styles.twoPaneGrid}>
          {/* List Pane */}
          <div className={styles.paneList}>
            <div className={styles.paneHeader}>
              <h2 className={styles.paneTitle}>IT Services</h2>
              <Button variant="secondary" size="compact" onClick={handleStartCreate}>
                <Plus size={16} weight="light" />
                <span>New service</span>
              </Button>
            </div>
            {services.map((srv) => (
              <div
                key={srv.id}
                className={`${styles.listItem} ${selectedService?.id === srv.id ? styles.listItemSelected : ''}`}
                onClick={() => handleSelect(srv)}
              >
                <div>
                  <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{srv.name}</span>
                </div>
                <span
                  style={{
                    fontSize: 'var(--fs-meta)',
                    color: srv.active ? 'var(--green)' : 'var(--text-3)',
                  }}
                >
                  {srv.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>

          {/* Editor Pane */}
          <div className={styles.paneEditor}>
            {selectedService || isCreating ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <h2 className={styles.paneTitle}>{isCreating ? 'Create new service' : 'Edit service'}</h2>
                  <Input
                    id="srv-name"
                    label="Service name"
                    placeholder="e.g. Identity & Access Management"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (e.target.value.trim()) setNameError('');
                    }}
                    error={nameError}
                    required
                  />

                  <Textarea
                    id="srv-desc"
                    label="Description"
                    placeholder="Scope of support covered by this service catalog entry..."
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />

                  <Select
                    id="srv-criticality"
                    label="Criticality tier"
                    options={[
                      { value: 0, label: '0 — Low' },
                      { value: 1, label: '1 — Standard' },
                      { value: 2, label: '2 — High' },
                      { value: 3, label: '3 — Mission Critical' },
                    ]}
                    value={criticality}
                    onChange={(e) => setCriticality(Number(e.target.value))}
                  />

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      style={{ width: '1rem', height: '1rem', accentColor: 'var(--btn-primary-bg)' }}
                    />
                    <span style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-1)' }}>Active in catalog</span>
                  </label>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="compact"
                      onClick={() => {
                        setIsCreating(false);
                        setSelectedService(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="compact" isLoading={saveServiceMutation.isPending}>
                      Save service
                    </Button>
                  </div>
                </form>

                {/* SLA Policy Editor Table (when editing existing service) */}
                {selectedService && !isCreating && (
                  <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 'var(--space-5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                      <h3 className={styles.paneTitle} style={{ fontSize: 'var(--fs-label)' }}>
                        SLA Policy Matrix
                      </h3>
                      <Button
                        variant="secondary"
                        size="compact"
                        isLoading={saveSlaMutation.isPending}
                        onClick={() => saveSlaMutation.mutate()}
                      >
                        Save SLA targets
                      </Button>
                    </div>

                    <table className={styles.slaTable}>
                      <thead>
                        <tr>
                          <th className={styles.slaTh}>Priority</th>
                          <th className={styles.slaTh}>Response (mins)</th>
                          <th className={styles.slaTh}>Resolution (hours)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(['P1', 'P2', 'P3', 'P4'] as const).map((p) => {
                          const target = slaTargets[p] || { responseSeconds: 3600, resolutionSeconds: 28800 };
                          return (
                            <tr key={p}>
                              <td className={styles.slaTd} style={{ fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                                {p}
                              </td>
                              <td className={styles.slaTd}>
                                <input
                                  type="number"
                                  min={1}
                                  value={Math.round(target.responseSeconds / 60)}
                                  onChange={(e) => {
                                    const mins = Number(e.target.value);
                                    setSlaTargets({
                                      ...slaTargets,
                                      [p]: { ...target, responseSeconds: mins * 60 },
                                    });
                                  }}
                                  style={{
                                    width: '100px',
                                    height: '2.25rem',
                                    padding: '0 var(--space-2)',
                                    borderRadius: 'var(--r-md)',
                                    border: '1px solid var(--line-2)',
                                    backgroundColor: 'var(--surface-2)',
                                    color: 'var(--text-1)',
                                  }}
                                />
                              </td>
                              <td className={styles.slaTd}>
                                <input
                                  type="number"
                                  min={0.5}
                                  step={0.5}
                                  value={Number((target.resolutionSeconds / 3600).toFixed(1))}
                                  onChange={(e) => {
                                    const hrs = Number(e.target.value);
                                    setSlaTargets({
                                      ...slaTargets,
                                      [p]: { ...target, resolutionSeconds: Math.round(hrs * 3600) },
                                    });
                                  }}
                                  style={{
                                    width: '100px',
                                    height: '2.25rem',
                                    padding: '0 var(--space-2)',
                                    borderRadius: 'var(--r-md)',
                                    border: '1px solid var(--line-2)',
                                    backgroundColor: 'var(--surface-2)',
                                    color: 'var(--text-1)',
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
                <p style={{ color: 'var(--text-2)', fontSize: 'var(--fs-body)' }}>
                  Select a service to configure its parameters and SLA policies.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

