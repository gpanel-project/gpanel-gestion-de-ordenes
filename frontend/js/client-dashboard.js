const user = checkAuth();

if (user && user.role !== 'cliente') {
  // Esta página es exclusiva del rol cliente; redirigimos al dashboard normal
  window.location.href = 'client-dashboard.html';
}

document.getElementById('appContainer').insertAdjacentHTML('afterbegin', renderSidebar('dashboard'));

const welcomeEl = document.getElementById('welcomeMsg');
if (welcomeEl && user) {
  welcomeEl.textContent = `Hola, ${user.name} — aquí puedes ver y gestionar tus órdenes de servicio`;
}

let myOrders = [];

// ─── Estadísticas ───────────────────────────────────────────
async function loadStats() {
  try {
    const stats = await apiRequest('/orders/stats/summary');
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
      <div class="stat-card total">
        <div><div class="number">${stats.total || 0}</div><div class="label">Mis órdenes</div></div>
        <div class="stat-card__icon"><i class="fa-solid fa-list-check"></i></div>
      </div>
      <div class="stat-card pendiente">
        <div><div class="number">${stats.pendientes || 0}</div><div class="label">Pendientes</div></div>
        <div class="stat-card__icon"><i class="fa-solid fa-clock"></i></div>
      </div>
      <div class="stat-card en_progreso">
        <div><div class="number">${stats.en_progreso || 0}</div><div class="label">En reparación</div></div>
        <div class="stat-card__icon"><i class="fa-solid fa-arrows-rotate"></i></div>
      </div>
      <div class="stat-card completada">
        <div><div class="number">${stats.completadas || 0}</div><div class="label">Completadas</div></div>
        <div class="stat-card__icon"><i class="fa-solid fa-check"></i></div>
      </div>
    `;
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

// ─── Listado de órdenes ─────────────────────────────────────
function statusLabel(status) {
  const map = {
    pendiente: 'Pendiente',
    en_progreso: 'En reparación',
    completada: 'Completada',
    cancelada: 'Cancelada'
  };
  return map[status] || status;
}

function renderOrders() {
  const tbody = document.getElementById('ordersTable');

  if (myOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px">
      Aún no tienes órdenes de servicio. <a href="order-new.html">Crea la primera</a>.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = myOrders.map(order => `
    <tr>
      <td><strong>${order.order_number}</strong></td>
      <td class="order-desc-cell" title="${(order.description || '').replace(/"/g, '&quot;')}">${order.description}</td>
      <td>${order.technician_name ? order.technician_name : '<span class="tech-unassigned">Sin asignar</span>'}</td>
      <td><span class="badge badge-${order.status}">${statusLabel(order.status)}</span></td>
      <td>${new Date(order.created_at).toLocaleDateString('es-CO')}</td>
      <td class="actions-cell">
        <a href="order-detail.html?id=${order.id}" class="btn btn-primary btn-sm">Ver</a>
        ${order.status === 'pendiente'
          ? `<button class="btn btn-danger btn-sm" onclick="cancelOrder(${order.id})">Cancelar</button>`
          : ''}
      </td>
    </tr>
  `).join('');
}

async function loadOrders() {
  try {
    myOrders = await apiRequest('/orders');
    renderOrders();
  } catch (error) {
    console.error('Error cargando órdenes:', error);
    document.getElementById('ordersTable').innerHTML =
      `<tr><td colspan="6" style="text-align:center;padding:30px">No se pudieron cargar tus órdenes</td></tr>`;
  }
}

// ─── Cancelar orden (solo si sigue pendiente) ───────────────
async function cancelOrder(id) {
  if (!confirm('¿Seguro que deseas cancelar esta orden?\n\nEsta acción no se puede deshacer.')) return;

  try {
    await apiRequest(`/orders/${id}/cancel`, 'PATCH');
    await Promise.all([loadOrders(), loadStats()]);
  } catch (error) {
    alert('No se pudo cancelar la orden:\n' + error.message);
  }
}

// ─── Botón / modal de ayuda ──────────────────────────────────
const helpFab = document.getElementById('helpFab');
const helpModal = document.getElementById('helpModal');

function openHelp() { helpModal.style.display = 'flex'; }
function closeHelp() { helpModal.style.display = 'none'; }

helpFab.addEventListener('click', openHelp);
document.getElementById('helpModalClose').addEventListener('click', closeHelp);
document.getElementById('helpModalCloseBtn').addEventListener('click', closeHelp);
helpModal.addEventListener('click', (e) => { if (e.target === helpModal) closeHelp(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeHelp(); });

document.getElementById('helpWhatsapp').addEventListener('click', () => {
  window.open('https://wa.me/573000000000?text=Hola,%20necesito%20ayuda%20con%20una%20orden%20de%20servicio', '_blank');
});
document.getElementById('helpEmail').addEventListener('click', () => {
  window.location.href = 'mailto:soporte@vusuministros.com?subject=Ayuda%20con%20orden%20de%20servicio';
});

loadStats();
loadOrders();
