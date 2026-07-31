// ─── Sistema de tema claro / oscuro ──────────────────────────
const THEME_KEY = 'gpanel-theme';

function getSavedTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

function setTheme(theme, persist = true) {
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) localStorage.setItem(THEME_KEY, theme);
  syncThemeIcons(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function syncThemeIcons(theme) {
  const isDark = theme === 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const iconEl = btn.querySelector('.theme-icon, i');
    if (iconEl) {
      if (iconEl.tagName === 'I') {
        iconEl.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      } else {
        iconEl.textContent = isDark ? '☀️' : '🌙';
      }
    }
    const label = btn.querySelector('.theme-label');
    if (label) label.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
    const nextLabel = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    btn.setAttribute('aria-label', nextLabel);
    btn.setAttribute('title', nextLabel);
  });
}

// Aplicar tema guardado lo antes posible (evita parpadeo)
setTheme(getSavedTheme(), false);

// Delegación de clic — funciona aunque el sidebar se inyecte por JS
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-theme-toggle]');
  if (btn) toggleTheme();
});

// Sincronizar iconos cuando el DOM esté listo (sidebar ya inyectado)
document.addEventListener('DOMContentLoaded', () => {
  syncThemeIcons(document.documentElement.getAttribute('data-theme') || 'light');
});
