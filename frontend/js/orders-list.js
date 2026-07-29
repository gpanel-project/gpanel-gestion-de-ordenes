const user = checkAuth();

document.getElementById('appContainer').insertAdjacentHTML(
  'afterbegin',
  renderSidebar('orders')
);

let allOrders = [];

// ─── Cargamos todas las órdenes ────────────────────────────
async function loadOrders() {
  try {
    allOrders = await apiRequest('/orders');
    renderOrders(allOrders);
  } catch (error) {
    console.error('Error cargando órdenes:', error);
  }
}

// ─── Dibujamos las órdenes en la tabla ─────────────────────
function renderOrders(orders) {
  const tbody = document.getElementById('ordersTable');

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px;">No hay órdenes registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.order_number}</strong></td>
      <td>${order.client_name}</td>
      <td>${order.technician_name}</td>
      <td>${order.description.substring(0, 40)}${order.description.length > 40 ? '...' : ''}</td>
      <td><span class="badge badge-${order.status}">${order.status.replace('_', ' ')}</span></td>
      <td>$${Number(order.total_cost || 0).toLocaleString('es-CO')}</td>
      <td>${new Date(order.created_at).toLocaleDateString('es-CO')}</td>
      <td><a href="order-detail.html?id=${order.id}" class="btn btn-primary btn-sm">Ver</a></td>
    </tr>
  `).join('');
}

// ─── Filtro por estado ──────────────────────────────────────
document.getElementById('filterStatus').addEventListener('change', (e) => {
  const status = e.target.value;
  if (!status) {
    renderOrders(allOrders);
  } else {
    renderOrders(allOrders.filter(o => o.status === status));
  }
});

loadOrders();