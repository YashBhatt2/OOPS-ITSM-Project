import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Field/Field';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest } from '@/lib/api';
import { Category, Skill, Dashboard } from '../types';
import { SetupNav } from './SetupNav';
import styles from './setup.module.css';

export function CategoriesSetupPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [requirements, setRequirements] = useState<Record<string, number>>({});
  const [nameError, setNameError] = useState('');

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  const { data: categories = [], refetch } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: () => apiRequest('/api/v1/admin/categories'),
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ['admin-skills'],
    queryFn: () => apiRequest('/api/v1/admin/skills'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Filter requirements to level > 0
      const filteredReqs: Record<string, number> = {};
      Object.entries(requirements).forEach(([sId, lvl]) => {
        if (lvl > 0) filteredReqs[sId] = lvl;
      });

      if (isCreating) {
        return await apiRequest('/api/v1/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), active, requirements: filteredReqs }),
        });
      } else if (selectedCat) {
        return await apiRequest(`/api/v1/admin/categories/${selectedCat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), active, requirements: filteredReqs }),
        });
      }
    },
    onSuccess: () => {
      showToast({ title: isCreating ? 'Category created.' : 'Category updated.', type: 'success' });
      setIsCreating(false);
      refetch();
    },
    onError: () => {
      showToast({ title: 'Failed to save category.', type: 'error' });
    },
  });

  const handleSelect = (cat: Category) => {
    setSelectedCat(cat);
    setIsCreating(false);
    setName(cat.name);
    setActive(cat.active);
    setRequirements(cat.requirements || {});
    setNameError('');
  };

  const handleStartCreate = () => {
    setSelectedCat(null);
    setIsCreating(true);
    setName('');
    setActive(true);
    setRequirements({});
    setNameError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Category name is required.');
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
            Configure categories and required technician skill proficiencies.
          </p>
        </div>

        <SetupNav />

        <div className={styles.twoPaneGrid}>
          {/* List Pane */}
          <div className={styles.paneList}>
            <div className={styles.paneHeader}>
              <h2 className={styles.paneTitle}>Categories</h2>
              <Button variant="secondary" size="compact" onClick={handleStartCreate}>
                <Plus size={16} weight="light" />
                <span>New category</span>
              </Button>
            </div>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`${styles.listItem} ${selectedCat?.id === cat.id ? styles.listItemSelected : ''}`}
                onClick={() => handleSelect(cat)}
              >
                <div>
                  <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{cat.name}</span>
                </div>
                <span
                  style={{
                    fontSize: 'var(--fs-meta)',
                    color: cat.active ? 'var(--green)' : 'var(--text-3)',
                  }}
                >
                  {cat.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>

          {/* Editor Pane */}
          <div className={styles.paneEditor}>
            {selectedCat || isCreating ? (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <h2 className={styles.paneTitle}>{isCreating ? 'Create new category' : 'Edit category'}</h2>
                <Input
                  id="cat-name"
                  label="Category name"
                  placeholder="e.g. Network Connectivity"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setNameError('');
                  }}
                  error={nameError}
                  required
                />
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    style={{ width: '1rem', height: '1rem', accentColor: 'var(--btn-primary-bg)' }}
                  />
                  <span style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-1)' }}>Active category</span>
                </label>

                {/* Skill Requirements */}
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: 'var(--fs-label)', color: 'var(--text-1)', marginBottom: 'var(--space-2)' }}>
                    Required skill proficiencies
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
                          value={requirements[skill.id] || 0}
                          onChange={(e) =>
                            setRequirements({ ...requirements, [skill.id]: Number(e.target.value) })
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
                          <option value={0}>0 — Not required</option>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="compact"
                    onClick={() => {
                      setIsCreating(false);
                      setSelectedCat(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="compact" isLoading={saveMutation.isPending}>
                    Save category
                  </Button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
                <p style={{ color: 'var(--text-2)', fontSize: 'var(--fs-body)' }}>
                  Select a category to view or edit required skills.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

