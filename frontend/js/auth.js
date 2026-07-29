// ─── Verifica si el usuario está logueado ──────────────────
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return null;
  }
  return JSON.parse(localStorage.getItem('user'));
}

// ─── Cierra sesión ──────────────────────────────────────────
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}