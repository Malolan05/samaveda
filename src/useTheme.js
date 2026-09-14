import { useCallback, useEffect, useState } from 'react';

// Theme is intentionally kept in memory only (no localStorage) — every
// fresh load starts in light mode, matching the original static site.
export default function useTheme() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return [theme, toggleTheme];
}
