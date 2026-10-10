import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from './button';

interface ThemeToggleProps {
  className?: string;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  variant = 'ghost',
  size = 'sm',
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before hydration completes, check DOM class or default to dark
  const isHydratedDark = mounted 
    ? (resolvedTheme || theme) === 'dark'
    : typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark') || !document.documentElement.classList.contains('light')
      : true;

  const isDark = isHydratedDark;
  const nextTheme = isDark ? 'light' : 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const toggleTheme = () => {
    setTheme(nextTheme);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`h-8 w-8 p-0 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors duration-150 motion-reduce:transition-none select-none ${className}`}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-colors duration-150" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-accent transition-colors duration-150" aria-hidden="true" />
      )}
    </Button>
  );
};

export default ThemeToggle;
