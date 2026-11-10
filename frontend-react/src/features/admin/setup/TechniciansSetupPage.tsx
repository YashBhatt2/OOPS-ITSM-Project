import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Field/Field';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest } from '@/lib/api';
import { Technician, Skill, Dashboard } from '../types';
import { SetupNav } from './SetupNav';
import styles from './setup.module.css';

export function TechniciansSetupPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [available, setAvailable] = useState(true);
  const [capacity, setCapacity] = useState(5);
  const [experienceMonths, setExperienceMonths] = useState(12);
  const [techSkills, setTechSkills] = useState<Record<string, number>>({});

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  const { data: technicians = [], refetch } = useQuery<Technician[]>({
    queryKey: ['admin-technicians'],
    queryFn: () => apiRequest('/api/v1/admin/technicians'),
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['admin-skills'],
    queryFn: () => apiRequest('/api/v1/admin/skills'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTech) return;
      const filteredSkills: Record<string, number> = {};
      Object.entries(techSkills).forEach(([sId, lvl]) => {
        if (lvl > 0) filteredSkills[sId] = lvl;
      });

      return await apiRequest(`/api/v1/admin/technicians/${selectedTech.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available,
          capacity,
          experienceMonths,
          skills: filteredSkills,
        }),
      });
    },
    onSuccess: () => {
      showToast({ title: 'Technician profile updated.', type: 'success' });
      refetch();
    },
    onError: () => {
      showToast({ title: 'Failed to update technician.', type: 'error' });
    },
  });

  const handleSelect = (tech: Technician) => {
    setSelectedTech(tech);
    setAvailable(tech.available);
    setCapacity(tech.capacity);
    setExperienceMonths(tech.experienceMonths);
    setTechSkills(tech.skills || {});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
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
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h1 className={styles.paneTitle} style={{ fontSize: 'var(--fs-title-1)' }}>
            System setup
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 'var(--fs-body)', margin: 'var(--space-1) 0 0' }}>
            Manage technician dispatch capacity, shift availability, and specialized skills.
          </p>
        </div>

        <SetupNav />

        <div className={styles.twoPaneGrid}>
          {/* List Pane */}
          <div className={styles.paneList}>
            <div className={styles.paneHeader}>
              <h2 className={styles.paneTitle}>Technician roster</h2>
            </div>
            {technicians.map((tech) => (
              <div
                key={tech.id}
                className={`${styles.listItem} ${selectedTech?.id === tech.id ? styles.listItemSelected : ''}`}
                onClick={() => handleSelect(tech)}
              >
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{tech.displayName}</div>
                  <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>{tech.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: 'var(--fs-meta)',
                      color: tech.available ? 'var(--green)' : 'var(--text-3)',
                    }}
                  >
                    {tech.available ? 'Available' : 'Unavailable'}
                  </span>
                  <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                    {tech.activeWorkload} / {tech.capacity}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Editor Pane */}
          <div className={styles.paneEditor}>
            {selectedTech ? (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                  <h2 className={styles.paneTitle}>{selectedTech.displayName}</h2>
                  <p style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-2)', margin: 'var(--space-1) 0 0' }}>
                    {selectedTech.email}
                  </p>
                </div>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                    style={{ width: '1rem', height: '1rem', accentColor: 'var(--btn-primary-bg)' }}
                  />
                  <span style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-1)' }}>
                    Available for incident dispatch
                  </span>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <Input
                    id="tech-capacity"
                    label="Active capacity (max incidents)"
                    type="number"
                    min={1}
                    max={20}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    required
                  />

                  <Input
                    id="tech-exp"
                    label="Experience (months)"
                    type="number"
                    min={0}
                    value={experienceMonths}
                    onChange={(e) => setExperienceMonths(Number(e.target.value))}
                    required
                  />
                </div>

                {/* Skills Rating Map */}
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <h3 style={{ fontSize: 'var(--fs-label)', color: 'var(--text-1)', marginBottom: 'var(--space-2)' }}>
                    Skill proficiencies
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {skills.map((skill) => (
                      <div
                        key={skill.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <span style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-2)' }}>{skill.name}</span>
                        <select
                          value={techSkills[skill.id] || 0}
                          onChange={(e) =>
                            setTechSkills({ ...techSkills, [skill.id]: Number(e.target.value) })
                          }
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
                          <option value={0}>0 — None</option>
                          <option value={1}>1 — Beginner</option>
                          <option value={2}>2 — Intermediate</option>
                          <option value={3}>3 — Proficient</option>
                          <option value={4}>4 — Advanced</option>
                          <option value={5}>5 — Expert</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
                  <Button type="submit" variant="primary" size="compact" isLoading={saveMutation.isPending}>
                    Save technician profile
                  </Button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
                <p style={{ color: 'var(--text-2)', fontSize: 'var(--fs-body)' }}>
                  Select a technician from the roster to adjust availability and skills.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

