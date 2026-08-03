const user = checkAuth();
document.getElementById('appContainer').insertAdjacentHTML('afterbegin', renderSidebar('dashboard'));
async function loadStats() {
  try {
    const stats = await apiRequest('/orders/stats/summary');
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML =
      '<div class="stat-card total"><div><div class="number" data-count-to="' + stats.total + '">' + stats.total + '</div><div class="label">Total de ordenes</div></div><div class="stat-card__icon"><i class="fa-solid fa-list-check"></i></div></div>' +
      '<div class="stat-card pendiente"><div><div class="number" data-count-to="' + stats.pendientes + '">' + stats.pendientes + '</div><div class="label">Pendientes</div></div><div class="stat-card__icon"><i class="fa-solid fa-clock"></i></div></div>' +
      '<div class="stat-card en_progreso"><div><div class="number" data-count-to="' + stats.en_progreso + '">' + stats.en_progreso + '</div><div class="label">En progreso</div></div><div class="stat-card__icon"><i class="fa-solid fa-arrows-rotate"></i></div></div>' +
      '<div class="stat-card completada"><div><div class="number" data-count-to="' + stats.completadas + '">' + stats.completadas + '</div><div class="label">Completadas</div></div><div class="stat-card__icon"><i class="fa-solid fa-check"></i></div></div>' +
      '<div class="stat-card cancelada"><div><div class="number" data-count-to="' + stats.canceladas + '">' + stats.canceladas + '</div><div class="label">Canceladas</div></div><div class="stat-card__icon"><i class="fa-solid fa-xmark"></i></div></div>';
  } catch (error) {
    console.error('Error cargando estadisticas:', error);
  }
}
async function loadRecentOrders() {
  try {
    const orders = await apiRequest('/orders');
    const recent = orders.slice(0, 5);
    const tbody = document.getElementById('recentOrders');
    if (recent.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px">No hay ordenes registradas</td></tr>';
      return;
    }
    tbody.innerHTML = recent.map(function(o) {
      return '<tr><td><strong>' + o.order_number + '</strong></td><td>' + o.client_name + '</td><td>' + o.technician_name + '</td><td><span class="badge badge-' + o.status + '">' + o.status.replace('_', ' ') + '</span></td><td><a href="order-detail.html?id=' + o.id + '" class="btn btn-primary btn-sm">Ver</a></td></tr>';
    }).join('');
  } catch (error) {
    console.error('Error cargando ordenes:', error);
  }
}
loadStats();
loadRecentOrders();