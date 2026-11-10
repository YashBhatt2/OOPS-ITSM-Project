import React, { useEffect, useState } from 'react';
import { Sun, Moon, CircleHalf } from '@phosphor-icons/react';
import { Button } from '../Button/Button';

export type ThemeChoice = 'auto' | 'light' | 'dark';

export const ThemeToggle: React.FC = () => {
  const [choice, setChoice] = useState<ThemeChoice>('auto');

  useEffect(() => {
    try {
      const stored = (localStorage.getItem('theme-preference') as ThemeChoice) || 'auto';
      setChoice(stored);
    } catch {
      setChoice('auto');
    }
  }, []);

  const cycleTheme = () => {
    const next: Record<ThemeChoice, ThemeChoice> = {
      auto: 'dark',
      dark: 'light',
      light: 'auto',
    };
    const newChoice = next[choice];
    setChoice(newChoice);

    try {
      localStorage.setItem('theme-preference', newChoice);
    } catch {
      // Ignore
    }

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const effective =
      newChoice === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : newChoice;
    document.documentElement.setAttribute('data-theme', effective);
    document.documentElement.setAttribute('data-theme-choice', newChoice);
  };

  const getIcon = () => {
    if (choice === 'auto') return <CircleHalf size={20} weight="light" />;
    if (choice === 'dark') return <Moon size={20} weight="light" />;
    return <Sun size={20} weight="light" />;
  };

  const getLabel = () => {
    if (choice === 'auto') return 'Theme: Auto (system). Click to switch to Dark.';
    if (choice === 'dark') return 'Theme: Dark. Click to switch to Light.';
    return 'Theme: Light. Click to switch to Auto.';
  };

  return (
    <Button
      variant="glassIcon"
      size="large"
      iconOnly
      onClick={cycleTheme}
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </Button>
  );
};

