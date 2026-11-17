import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Check, Bell, ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '@/features/auth/AuthContext';
import { Nav } from '@/components/ui/Nav/Nav';
import { Button } from '@/components/ui/Button/Button';
import { useToast } from '@/components/ui/Toast/Toast';
import { apiRequest } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import { Notification, PagedResult } from '@/features/admin/types';

export function NotificationsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifResult, refetch } = useQuery<PagedResult<Notification>>({
    queryKey: ['notifications'],
    queryFn: () => apiRequest('/api/v1/notifications?page=0&size=50'),
  });

  const notifications = notifResult?.items ?? [];

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/v1/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const unreadList = notifications.filter((n) => !n.readAt);
      await Promise.all(
        unreadList.map((n) =>
          apiRequest(`/api/v1/notifications/${n.id}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
    },
    onSuccess: () => {
      showToast({ title: 'All notifications marked as read.', type: 'success' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleClick = (n: Notification) => {
    if (!n.readAt) {
      markReadMutation.mutate(n.id);
    }
    if (n.incidentId) {
      if (user?.role === 'ADMIN') {
        navigate(`/admin/incidents/${n.incidentId}`);
      } else if (user?.role === 'TECHNICIAN') {
        navigate(`/technician/incidents/${n.incidentId}`);
      } else {
        navigate(`/employee/incidents/${n.incidentId}`);
      }
    }
  };

  const getBackPath = () => {
    if (user?.role === 'ADMIN') return '/admin';
    if (user?.role === 'TECHNICIAN') return '/technician';
    return '/employee';
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg)',
        color: 'var(--text-1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Nav
        role={user?.role}
        userDisplayName={user?.displayName}
        onLogout={logout}
        unreadNotificationsCount={unreadCount}
      />

      <main
        style={{
          flex: 1,
          maxWidth: 'var(--content-max)',
          width: '100%',
          margin: '0 auto',
          padding: 'var(--space-6) var(--margin) calc(var(--space-10) + 4rem)',
        }}
      >
        <Link
          to={getBackPath()}
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
          <span>Back</span>
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-6)',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--fs-serif-title)', margin: 0, fontWeight: 400 }}>
              Notifications
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: 'var(--fs-body)', margin: 'var(--space-1) 0 0' }}>
              System dispatches, lifecycle stage transitions, and comments.
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="compact"
              isLoading={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              <Check size={16} weight="light" />
              <span>Mark all read</span>
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-9) var(--space-4)',
              backgroundColor: 'var(--surface-1)',
              borderRadius: 'var(--r-xl)',
              border: '1px solid var(--line-1)',
            }}
          >
            <Bell size={32} weight="light" color="var(--text-3)" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--fs-title-2)', margin: 'var(--space-3) 0 var(--space-1)' }}>
              You're all caught up
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: 'var(--fs-body)', margin: 0 }}>
              No notifications to display right now.
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--line-1)',
              borderRadius: 'var(--r-xl)',
              overflow: 'hidden',
            }}
          >
            {notifications.map((n) => {
              const isUnread = !n.readAt;
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--line-1)',
                    borderLeft: isUnread ? '3px solid var(--blue)' : '3px solid transparent',
                    backgroundColor: isUnread ? 'var(--surface-2)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                    transition: 'background-color var(--dur-1) var(--ease-out)',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: 'var(--fs-body)',
                        fontWeight: isUnread ? 600 : 400,
                        color: 'var(--text-1)',
                        margin: 0,
                      }}
                    >
                      {n.message}
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--fs-meta)',
                      color: 'var(--text-3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
