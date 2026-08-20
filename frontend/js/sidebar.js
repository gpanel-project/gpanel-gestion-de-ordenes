// Genera el HTML del sidebar según el rol del usuario
function renderSidebar(activePage) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return '';

  // Links visibles para todos (el dashboard del cliente es una página aparte)
  const dashboardHref = user.role === 'cliente' ? 'client-dashboard.html' : 'dashboard.html';
  let links = `
    <a href="${dashboardHref}" class="${activePage === 'dashboard' ? 'active' : ''}"><i class="fa-solid fa-square-poll-vertical"></i> Dashboard</a>
    <a href="orders-list.html" class="${activePage === 'orders' ? 'active' : ''}"><i class="fa-solid fa-clipboard"></i> Órdenes</a>
  `;

  // Links según rol
  if (user.role === 'admin') {
    links += `
      <a href="users.html" class="${activePage === 'users' ? 'active' : ''}"><i class="fa-solid fa-users"></i> Usuarios</a>
      <a href="inventory.html" class="${activePage === 'inventory' ? 'active' : ''}"><i class="fa-solid fa-boxes-stacked"></i> Inventario</a>
    `;
  } else if (user.role === 'cliente') {
    links += `
      <a href="order-new.html" class="${activePage === 'order-new' ? 'active' : ''}"><i class="fa-solid fa-plus"></i> Nueva Orden</a>
    `;
  }

  return `
    <div class="mobile-header">
      <div class="mobile-header__brand">
        <img src="https://res.cloudinary.com/ztbcsp9h/image/upload/gpanel-web/gpanel-logo-light.png" alt="GPanel" class="mobile-header__logo">
        
      </div>
      <button class="menu-toggle" type="button" data-menu-toggle aria-label="Abrir menú de navegación" title="Abrir menú">
        <i class="fa-solid fa-bars"></i>
      </button>
    </div>

    <aside class="sidebar">
      <div class="sidebar-header">
        <img src="https://res.cloudinary.com/ztbcsp9h/image/upload/gpanel-web/gpanel-logo-light.png" alt="GPanel" class="sidebar-header__logo">
        <p>${user.name} (${user.role})</p>
        <button class="sidebar-close" type="button" data-menu-close aria-label="Cerrar menú" title="Cerrar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <nav class="sidebar-nav">
        ${links}
      </nav>
      <div class="sidebar-footer">
        <button onclick="logout()">Cerrar sesión</button>
      </div>
    </aside>
  `;
}

// ─── Menú hamburguesa (solo móvil) ───────────────────────────
function toggleMenu(force) {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  const open = typeof force === 'boolean' ? force : !sidebar.classList.contains('is-open');
  sidebar.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-menu-toggle]')) return toggleMenu();
  if (e.target.closest('[data-menu-close]')) return toggleMenu(false);
  if (e.target.closest('.sidebar-nav a')) toggleMenu(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') toggleMenu(false);
});
