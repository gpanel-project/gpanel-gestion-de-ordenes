// Genera el HTML del sidebar según el rol del usuario
function renderSidebar(activePage) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return '';

  // Links visibles para todos
  let links = `
    <a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}"><i class="fa-solid fa-square-poll-vertical"></i> Dashboard</a>
    <a href="orders-list.html" class="${activePage === 'orders' ? 'active' : ''}"><i class="fa-solid fa-clipboard"></i> Órdenes</a>
  `;

  // Links según rol
  if (user.role === 'admin') {
    links += `     
      <a href="users.html" class="${activePage === 'users' ? 'active' : ''}"><i class="fa-solid fa-users"></i> Usuarios</a>
    `;
  } else if (user.role === 'cliente') {
    links += `
      <a href="order-new.html" class="${activePage === 'order-new' ? 'active' : ''}"><i class="fa-solid fa-plus"></i> Nueva Orden</a>
    `;
  }

  return `
    <div class="sidebar">
      <div class="sidebar-header">
        <img src="assets/gpanel-logo-light.png" alt="GPanel" class="sidebar-header__logo">
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