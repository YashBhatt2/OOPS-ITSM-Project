import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Bell, House, Queue, WarningOctagon, ChartBar, Gear, SignOut, CheckCircle } from '@phosphor-icons/react';
import { Role } from '@/lib/constants';
import { Brand } from '../Brand/Brand';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { SettingsDialog } from '../SettingsDialog/SettingsDialog';
import { Button } from '../Button/Button';
import styles from './Nav.module.css';

export interface NavProps {
  role?: Role;
  unreadNotificationsCount?: number;
  onLogout?: () => void;
  userDisplayName?: string;
}

export const Nav: React.FC<NavProps> = ({
  role = 'EMPLOYEE',
  unreadNotificationsCount = 0,
  onLogout,
  userDisplayName,
}) => {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const getLinks = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { to: '/admin', label: 'Overview', icon: <House size={24} weight="light" /> },
          { to: '/incidents', label: 'Incidents', icon: <Queue size={24} weight="light" /> },
          { to: '/admin/verification', label: 'Verification', icon: <CheckCircle size={24} weight="light" /> },
          { to: '/admin/reports', label: 'Reports', icon: <ChartBar size={24} weight="light" /> },
          { to: '/admin/setup', label: 'Setup', icon: <Gear size={24} weight="light" /> },
        ];
      case 'TECHNICIAN':
        return [
          { to: '/technician', label: 'Queue', icon: <Queue size={24} weight="light" /> },
          { to: '/incidents', label: 'Incidents', icon: <WarningOctagon size={24} weight="light" /> },
          { to: '/notifications', label: 'Notifications', icon: <Bell size={24} weight="light" /> },
        ];
      case 'EMPLOYEE':
      default:
        return [
          { to: '/employee', label: 'Home', icon: <House size={24} weight="light" /> },
          { to: '/incidents', label: 'Incidents', icon: <Queue size={24} weight="light" /> },
          { to: '/notifications', label: 'Notifications', icon: <Bell size={24} weight="light" /> },
        ];
    }
  };

  const links = getLinks();
  const isExactRoute = (path: string) =>
    path === '/admin' || path === '/employee' || path === '/technician';

  return (
    <>
      <header className={styles.topBar}>
        <Brand />
        <nav className={styles.centerTabs} aria-label="Main navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={isExactRoute(link.to)}
              className={({ isActive }) =>
                clsx(styles.tabLink, isActive && styles.activeTab)
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.rightControls}>
          <button
            type="button"
            className={styles.bellButton}
            onClick={() => navigate('/notifications')}
            aria-label={`Notifications${
              unreadNotificationsCount > 0 ? `, ${unreadNotificationsCount} unread` : ''
            }`}
          >
            <Bell size={20} weight="light" />
            {unreadNotificationsCount > 0 && <span className={styles.unreadDot} />}
          </button>
          <Button
            variant="glassIcon"
            size="large"
            iconOnly
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
          >
            <Gear size={20} weight="light" />
          </Button>
          <ThemeToggle />
          {onLogout && (
            <Button
              variant="ghost"
              size="compact"
              onClick={onLogout}
              aria-label="Sign out"
              title={userDisplayName ? `Sign out (${userDisplayName})` : 'Sign out'}
            >
              <SignOut size={18} weight="light" />
              <span>Sign out</span>
            </Button>
          )}
        </div>
      </header>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Mobile Glass Bottom Tab Bar */}
      <nav className={styles.bottomTabBar} aria-label="Mobile navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={isExactRoute(link.to)}
            className={({ isActive }) =>
              clsx(styles.bottomTab, isActive && styles.activeBottomTab)
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};

