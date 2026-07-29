// Genera el HTML del sidebar según el rol del usuario
function renderSidebar(activePage) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return '';

  // Links visibles para todos
  let links = `
    <a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">📊 Dashboard</a>
    <a href="orders-list.html" class="${activePage === 'orders' ? 'active' : ''}">📋 Órdenes</a>
  `;

  // Links solo para admin
  if (user.role === 'admin') {
    links += `
      <a href="order-new.html" class="${activePage === 'order-new' ? 'active' : ''}">➕ Nueva Orden</a>
      <a href="users.html" class="${activePage === 'users' ? 'active' : ''}">👥 Usuarios</a>
    `;
  }

  return `
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>Panel de Control</h2>
        <p>${user.name} (${user.role})</p>
      </div>
      <nav class="sidebar-nav">
        ${links}
      </nav>
      <div class="sidebar-footer">
        <button onclick="logout()">Cerrar sesión</button>
      </div>
    </div>
  `;
}