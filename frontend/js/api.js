// ─── Configuración base ────────────────────────────────────
const API_URL = 'http://localhost:3000/api';

// ─── Función genérica para hacer peticiones ────────────────
async function apiRequest(endpoint, method = 'GET', body = null, requireAuth = true) {
  const headers = {
    'Content-Type': 'application/json'
  };

  // Si la ruta requiere autenticación, agregamos el token
  if (requireAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    // Si el servidor responde con error, lo lanzamos para manejarlo arriba
    throw new Error(data.error || 'Error en la petición');
  }

  return data;
}