export type ThemeSetting = 'light' | 'dark' | 'system';

const DARK_META_COLOR = '#1c1a17';
const LIGHT_META_COLOR = '#1a1a2e';

export function applyTheme(theme: ThemeSetting): void {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    document.documentElement.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', isDark ? DARK_META_COLOR : LIGHT_META_COLOR);
  }

  localStorage.setItem('td-theme', theme);
}
