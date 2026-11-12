import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { House, Queue, WarningOctagon, ChartBar, Gear, SignOut, CheckCircle } from '@phosphor-icons/react';
import { Role } from '@/lib/constants';
import { Brand } from '../Brand/Brand';
import { Island } from '../Island/Island';
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
  onLogout,
  userDisplayName,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const signOutButtonRef = useRef<HTMLDivElement | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; right: number } | null>(null);

  // Measure sign out button for portaled popover
  useEffect(() => {
    if (signOutConfirmOpen && signOutButtonRef.current) {
      const update = () => {
        const rect = signOutButtonRef.current?.getBoundingClientRect();
        if (rect) {
          setPopoverPosition({
            top: rect.bottom + 8,
            right: Math.max(16, window.innerWidth - rect.right),
          });
        }
      };
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    }
  }, [signOutConfirmOpen]);

  // Close sign out confirm on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && signOutConfirmOpen) {
        setSignOutConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [signOutConfirmOpen]);

  const getLinks = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { to: '/admin', label: 'Overview', icon: <House size={24} weight="light" /> },
          { to: '/admin/incidents', label: 'Incidents', icon: <Queue size={24} weight="light" /> },
          { to: '/admin/verification', label: 'Verification', icon: <CheckCircle size={24} weight="light" /> },
          { to: '/admin/reports', label: 'Reports', icon: <ChartBar size={24} weight="light" /> },
          { to: '/admin/setup', label: 'Setup', icon: <Gear size={24} weight="light" /> },
        ];
      case 'TECHNICIAN':
        return [
          { to: '/technician', label: 'Queue', icon: <Queue size={24} weight="light" /> },
          { to: '/technician/incidents', label: 'Incidents', icon: <WarningOctagon size={24} weight="light" /> },
        ];
      case 'EMPLOYEE':
      default:
        return [
          { to: '/employee', label: 'Home', icon: <House size={24} weight="light" /> },
          { to: '/incidents', label: 'Incidents', icon: <Queue size={24} weight="light" /> },
        ];
    }
  };

  const links = getLinks();
  const location = useLocation();

  const isTabActive = (to: string) => {
    if (to === '/admin' || to === '/employee' || to === '/technician') {
      return location.pathname === to;
    }
    if (to === '/incidents') {
      return location.pathname.startsWith('/incidents') || location.pathname.startsWith('/employee/incidents');
    }
    return location.pathname.startsWith(to);
  };

  return (
    <>
      <header className={styles.topBar}>
        <div className={styles.navContainer}>
          <Brand />

          <nav className={styles.centerTabs} aria-label="Main navigation">
            {links.map((link) => {
              const active = isTabActive(link.to);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={clsx(styles.tabLink, active && styles.activeTab)}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </nav>

          <div className={styles.rightControls}>
            {/* The Island: Notification Instrument positioned in header action cluster */}
            <Island />

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

            {onLogout && (
              <div ref={signOutButtonRef} style={{ position: 'relative' }}>
                <Button
                  variant="ghost"
                  size="compact"
                  onClick={() => setSignOutConfirmOpen((prev) => !prev)}
                  aria-label="Sign out"
                  aria-expanded={signOutConfirmOpen}
                  title={userDisplayName ? `Sign out (${userDisplayName})` : 'Sign out'}
                >
                  <SignOut size={18} weight="light" />
                  <span>Sign out</span>
                </Button>

                {createPortal(
                  <AnimatePresence>
                    {signOutConfirmOpen && (
                      <>
                        <motion.div
                          className={styles.popoverBackdrop}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.16 }}
                          onClick={() => setSignOutConfirmOpen(false)}
                          aria-hidden="true"
                        />
                        <motion.div
                          className={styles.confirmPopover}
                          style={
                            popoverPosition
                              ? {
                                  top: `${popoverPosition.top}px`,
                                  right: `${popoverPosition.right}px`,
                                }
                              : undefined
                          }
                          initial={{ opacity: 0, scale: 0.92, y: -8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92, y: -8 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                          role="dialog"
                          aria-label="Sign out confirmation"
                        >
                          <h4 className={styles.confirmTitle}>Sign out</h4>
                          <p className={styles.confirmDesc}>
                            Are you sure you want to end your session?
                          </p>
                          <div className={styles.confirmActions}>
                            <Button
                              variant="ghost"
                              size="compact"
                              onClick={() => setSignOutConfirmOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="compact"
                              onClick={() => {
                                setSignOutConfirmOpen(false);
                                onLogout();
                              }}
                            >
                              <SignOut size={16} weight="light" />
                              <span>Confirm</span>
                            </Button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>,
                  document.body
                )}
              </div>
            )}
          </div>
        </div>
        <div className={styles.scrollProgressHairline} aria-hidden="true" />
      </header>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Mobile Glass Bottom Tab Bar */}
      <nav className={styles.bottomTabBar} aria-label="Mobile navigation">
        {links.map((link) => {
          const active = isTabActive(link.to);
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={clsx(styles.bottomTab, active && styles.activeBottomTab)}
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};

