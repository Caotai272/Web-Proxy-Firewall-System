const storageKey = 'wpf-admin-theme';
const themeToggle = document.querySelector('[data-theme-toggle]');
const root = document.documentElement;

function getPreferredTheme() {
  const storedTheme = localStorage.getItem(storageKey);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  root.dataset.theme = theme;

  if (!themeToggle) {
    return;
  }

  const nextLabel = theme === 'dark' ? 'Light' : 'Dark';
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  const labelNode = themeToggle.querySelector('.theme-toggle-label');
  const iconNode = themeToggle.querySelector('.theme-toggle-icon');

  if (labelNode) {
    labelNode.textContent = nextLabel;
  }

  if (iconNode) {
    iconNode.textContent = theme === 'dark' ? '☀' : '◐';
  }
}

applyTheme(getPreferredTheme());

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  });
}
