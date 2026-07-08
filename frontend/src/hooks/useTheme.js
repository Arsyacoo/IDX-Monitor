import { useCallback, useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'idx-monitor-theme';

/**
 * Custom hook for dark/light theme toggling.
 * Persists preference in localStorage and applies 'light' class to <html>.
 * @returns {{ theme: string, toggleTheme: function, isDark: boolean }}
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
