import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useDarkMode(): [boolean, (value: boolean | ((val: boolean) => boolean)) => void] {
  const [isDark, setIsDark] = useLocalStorage<boolean>('darkMode', true); // default to dark

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // ensure the body itself reflects the bg
    document.body.style.backgroundColor = isDark
      ? 'var(--color-background)'
      : 'var(--color-background)';
  }, [isDark]);

  return [isDark, setIsDark];
}
