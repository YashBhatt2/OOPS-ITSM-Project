import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { Input, Textarea, Select } from '@/components/ui/Field/Field';
import { Segmented } from '@/components/ui/Segmented/Segmented';
import { Button } from '@/components/ui/Button/Button';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest, ApiError } from '@/lib/api';
import { Service, Category, SimilarReport, Incident, Dashboard } from './types';
import styles from './employee.module.css';

export function ReportIncidentPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [impact, setImpact] = useState<number>(1);
  const [urgency, setUrgency] = useState<number>(1);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [similarReports, setSimilarReports] = useState<SimilarReport[]>([]);
  const [isSimilarUnavailable, setIsSimilarUnavailable] = useState(false);

  // Dashboard for unread notifications count
  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ['dashboard', 'me'],
    queryFn: () => apiRequest('/api/v1/dashboards/me'),
  });

  // Services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => apiRequest('/api/v1/services'),
  });

  // Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => apiRequest('/api/v1/categories'),
  });

  // Set default service and category
  useEffect(() => {
    if (services.length > 0 && !serviceId) {
      const activeService = services.find((s) => s.active) || services[0];
      if (activeService) setServiceId(activeService.id);
    }
  }, [services, serviceId]);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      const activeCat = categories.find((c) => c.active) || categories[0];
      if (activeCat) setCategoryId(activeCat.id);
    }
  }, [categories, categoryId]);

  // Debounced Similar Reports Check
  useEffect(() => {
    const combined = `${title} ${description}`.trim();
    if (combined.length < 10) {
      setSimilarReports([]);
      setIsSimilarUnavailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await apiRequest<SimilarReport[]>('/api/v1/incidents/similar-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description }),
        });
        setSimilarReports(results || []);
        setIsSimilarUnavailable(false);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 503) {
          setIsSimilarUnavailable(true);
        } else {
          setIsSimilarUnavailable(false);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [title, description]);

  // Create Incident Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<Incident>('/api/v1/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          serviceId,
          categoryId,
          impact,
          urgency,
        }),
      });
    },
    onSuccess: (newIncident) => {
      showToast({
        title: `Incident ${newIncident.reference} reported.`,
        type: 'success',
        action: {
          label: 'View incident',
          onClick: () => navigate(`/employee/incidents/${newIncident.id}`),
        },
      });
      navigate(`/employee/incidents/${newIncident.id}`);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        const fieldMap: Record<string, string> = {};
        err.fieldErrors.forEach((fe) => {
          fieldMap[fe.field] = fe.message;
        });
        setErrors(fieldMap);
        if (err.message && Object.keys(fieldMap).length === 0) {
          showToast({ title: err.message, type: 'error' });
        }
      } else {
        showToast({ title: 'Failed to report incident. Please try again.', type: 'error' });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required.';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters.';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required.';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters.';
    }

    if (!serviceId) {
      newErrors.serviceId = 'Please select a service.';
    }

    if (!categoryId) {
      newErrors.categoryId = 'Please select a category.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    createMutation.mutate();
  };

  const serviceOptions = services
    .filter((s) => s.active)
    .map((s) => ({ value: s.id, label: s.name }));

  const categoryOptions = categories
    .filter((c) => c.active && (!c.serviceId || c.serviceId === serviceId))
    .map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className={styles.page}>
      <Nav
        role="EMPLOYEE"
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={dashboard?.unreadNotifications ?? 0}
      />

      <main className={styles.main}>
        <div className={styles.formContainer}>
          <Link to="/employee" className={styles.backLink}>
            <ArrowLeft size={16} weight="light" />
            <span>Back to requests</span>
          </Link>

          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h1 className={styles.greeting} style={{ marginBottom: 'var(--space-1)' }}>
              Report an incident
            </h1>
            <p className={styles.subgreeting}>
              Describe your issue or request. We will assign the best technician to assist you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.formCard}>
            <Input
              id="title"
              label="Subject or summary"
              placeholder="e.g. Cannot connect to VPN from home office"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              required
            />

            <Textarea
              id="description"
              label="Description of the issue"
              placeholder="Include what you were trying to do, error messages, and what steps you already took..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={errors.description}
              required
            />

            {/* Debounced Similar Reports Panel */}
            {similarReports.length > 0 && (
              <div className={styles.similarPanel}>
                <span className={styles.similarHeader}>Similar existing reports</span>
                {similarReports.slice(0, 3).map((sr) => (
                  <Link
                    key={sr.id}
                    to={`/employee/incidents/${sr.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.similarItem}
                  >
                    <span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{sr.reference}</strong> — {sr.title}
                    </span>
                    <ArrowUpRight size={14} weight="light" />
                  </Link>
                ))}
              </div>
            )}

            {isSimilarUnavailable && (
              <p className={styles.similarQuietNotice}>Similar reports unavailable right now.</p>
            )}

            <Select
              id="service"
              label="Service affected"
              options={serviceOptions}
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              error={errors.serviceId}
            />

            <Select
              id="category"
              label="Category"
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              error={errors.categoryId}
            />

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Who is impacted?</label>
              <Segmented
                options={[
                  { value: 1, label: 'Just me' },
                  { value: 2, label: 'A team' },
                  { value: 3, label: 'A department or more' },
                ]}
                value={impact}
                onChange={(val) => setImpact(Number(val))}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>How urgent is this?</label>
              <Segmented
                options={[
                  { value: 1, label: 'Can wait' },
                  { value: 2, label: 'Soon' },
                  { value: 3, label: 'Right now' },
                ]}
                value={urgency}
                onChange={(val) => setUrgency(Number(val))}
              />
            </div>

            <div style={{ marginTop: 'var(--space-2)' }}>
              <Button
                type="submit"
                variant="primary"
                size="large"
                isLoading={createMutation.isPending}
                style={{ width: '100%' }}
              >
                Submit request
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

