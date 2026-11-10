import React, { useEffect, useState } from 'react';
import { Sun, Moon } from '@phosphor-icons/react';
import { Button } from '../Button/Button';

export type ThemeChoice = 'light' | 'dark';

export const ThemeToggle: React.FC = () => {
  const [choice, setChoice] = useState<ThemeChoice>('dark');

  useEffect(() => {
    try {
      const stored = (localStorage.getItem('theme-preference') as ThemeChoice) || 'dark';
      setChoice(stored === 'light' ? 'light' : 'dark');
    } catch {
      setChoice('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextChoice: ThemeChoice = choice === 'dark' ? 'light' : 'dark';
    setChoice(nextChoice);

    try {
      localStorage.setItem('theme-preference', nextChoice);
    } catch {
      // Ignore
    }

    document.documentElement.setAttribute('data-theme', nextChoice);
    document.documentElement.setAttribute('data-theme-choice', nextChoice);
  };

  const isDark = choice === 'dark';

  return (
    <Button
      variant="glassIcon"
      size="large"
      iconOnly
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Ceramic light theme' : 'Switch to Obsidian dark theme'}
      title={isDark ? 'Switch to Ceramic light theme' : 'Switch to Obsidian dark theme'}
    >
      {isDark ? <Sun size={20} weight="light" /> : <Moon size={20} weight="light" />}
    </Button>
  );
};
