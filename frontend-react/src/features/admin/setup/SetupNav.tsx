import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import styles from './setup.module.css';

export function SetupNav() {
  const tabs = [
    { to: '/admin/setup/skills', label: 'Skills' },
    { to: '/admin/setup/categories', label: 'Categories' },
    { to: '/admin/setup/services', label: 'Services & SLA' },
    { to: '/admin/setup/technicians', label: 'Technicians' },
    { to: '/admin/setup/users', label: 'Users' },
  ];

  return (
    <nav className={styles.setupTabs} aria-label="Setup sections">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) => clsx(styles.setupTab, isActive && styles.setupTabActive)}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
