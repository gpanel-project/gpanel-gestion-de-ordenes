const user = checkAuth();

// ─── Insertamos el sidebar ──────────────────────────────────
document.getElementById('appContainer').insertAdjacentHTML(
  'afterbegin',
  renderSidebar('dashboard')
);

// ─── Cargamos las estadísticas ─────────────────────────────
async function loadStats() {
  try {
    const stats = await apiRequest('/orders/stats/summary');

    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
      <div class="stat-card total">
        <div class="number">${stats.total}</div>
        <div class="label">Total de órdenes</div>
      </div>
      <div class="stat-card pendiente">
        <div class="number">${stats.pendientes}</div>
        <div class="label">Pendientes</div>
      </div>
      <div class="stat-card en_progreso">
        <div class="number">${stats.en_progreso}</div>
        <div class="label">En progreso</div>
      </div>
      <div class="stat-card completada">
        <div class="number">${stats.completadas}</div>
        <div class="label">Completadas</div>
      </div>
      <div class="stat-card cancelada">
        <div class="number">${stats.canceladas}</div>
        <div class="label">Canceladas</div>
      </div>
    `;
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

// ─── Cargamos las últimas 5 órdenes ────────────────────────
async function loadRecentOrders() {
  try {
    const orders = await apiRequest('/orders');
    const recent = orders.slice(0, 5);

    const tbody = document.getElementById('recentOrders');

    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px;">No hay órdenes registradas</td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(order => `
      <tr>
        <td><strong>${order.order_number}</strong></td>
        <td>${order.client_name}</td>
        <td>${order.technician_name}</td>
        <td><span class="badge badge-${order.status}">${order.status.replace('_', ' ')}</span></td>
        <td><a href="order-detail.html?id=${order.id}" class="btn btn-primary btn-sm">Ver</a></td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error cargando órdenes:', error);
  }
}

loadStats();
loadRecentOrders();