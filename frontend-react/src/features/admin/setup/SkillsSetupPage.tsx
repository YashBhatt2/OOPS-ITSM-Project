import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Field/Field';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest } from '@/lib/api';
import { Skill, Dashboard } from '../types';
import { SetupNav } from './SetupNav';
import styles from './setup.module.css';

export function SkillsSetupPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillActive, setSkillActive] = useState(true);
  const [nameError, setNameError] = useState('');

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  const { data: skills = [], refetch } = useQuery<Skill[]>({
    queryKey: ['admin-skills'],
    queryFn: () => apiRequest('/api/v1/admin/skills'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isCreating) {
        return await apiRequest('/api/v1/admin/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: skillName.trim(), active: skillActive }),
        });
      } else if (selectedSkill) {
        return await apiRequest(`/api/v1/admin/skills/${selectedSkill.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: skillName.trim(), active: skillActive }),
        });
      }
    },
    onSuccess: () => {
      showToast({ title: isCreating ? 'Skill created.' : 'Skill updated.', type: 'success' });
      setIsCreating(false);
      refetch();
    },
    onError: () => {
      showToast({ title: 'Failed to save skill.', type: 'error' });
    },
  });

  const handleSelect = (skill: Skill) => {
    setSelectedSkill(skill);
    setIsCreating(false);
    setSkillName(skill.name);
    setSkillActive(skill.active);
    setNameError('');
  };

  const handleStartCreate = () => {
    setSelectedSkill(null);
    setIsCreating(true);
    setSkillName('');
    setSkillActive(true);
    setNameError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) {
      setNameError('Skill name is required.');
      return;
    }
    setNameError('');
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
            Configure skills, services, SLA thresholds, and team routing rules.
          </p>
        </div>

        <SetupNav />

        <div className={styles.twoPaneGrid}>
          {/* List Pane */}
          <div className={styles.paneList}>
            <div className={styles.paneHeader}>
              <h2 className={styles.paneTitle}>Skills roster</h2>
              <Button variant="secondary" size="compact" onClick={handleStartCreate}>
                <Plus size={16} weight="light" />
                <span>New skill</span>
              </Button>
            </div>
            {skills.map((skill) => (
              <div
                key={skill.id}
                className={`${styles.listItem} ${selectedSkill?.id === skill.id ? styles.listItemSelected : ''}`}
                onClick={() => handleSelect(skill)}
              >
                <div>
                  <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{skill.name}</span>
                </div>
                <span
                  style={{
                    fontSize: 'var(--fs-meta)',
                    color: skill.active ? 'var(--green)' : 'var(--text-3)',
                  }}
                >
                  {skill.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>

          {/* Editor Pane */}
          <div className={styles.paneEditor}>
            {selectedSkill || isCreating ? (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <h2 className={styles.paneTitle}>{isCreating ? 'Create new skill' : 'Edit skill'}</h2>
                <Input
                  id="skill-name"
                  label="Skill name"
                  placeholder="e.g. Database Administration"
                  value={skillName}
                  onChange={(e) => {
                    setSkillName(e.target.value);
                    if (e.target.value.trim()) setNameError('');
                  }}
                  error={nameError}
                  required
                />
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={skillActive}
                    onChange={(e) => setSkillActive(e.target.checked)}
                    style={{ width: '1rem', height: '1rem', accentColor: 'var(--btn-primary-bg)' }}
                  />
                  <span style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-1)' }}>Active skill</span>
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="compact"
                    onClick={() => {
                      setIsCreating(false);
                      setSelectedSkill(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="compact" isLoading={saveMutation.isPending}>
                    Save skill
                  </Button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
                <p style={{ color: 'var(--text-2)', fontSize: 'var(--fs-body)' }}>
                  Select a skill to edit or click "New skill" to add one.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
