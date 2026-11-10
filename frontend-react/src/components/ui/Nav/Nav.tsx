import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Bell, House, Queue, WarningOctagon, ChartBar, Gear, SignOut } from '@phosphor-icons/react';
import { Role } from '@/lib/constants';
import { Brand } from '../Brand/Brand';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
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

  const getLinks = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { to: '/admin', label: 'Overview', icon: <House size={24} weight="light" /> },
          { to: '/incidents', label: 'Incidents', icon: <Queue size={24} weight="light" /> },
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

  return (
    <>
      <header className={styles.topBar}>
        <Brand />
        <nav className={styles.centerTabs} aria-label="Main navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to !== '/incidents'}
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

      {/* Mobile Glass Bottom Tab Bar */}
      <nav className={styles.bottomTabBar} aria-label="Mobile navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to !== '/incidents'}
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

