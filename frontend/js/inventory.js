const user = checkAuth();
if (user.role !== 'admin') window.location.href = 'dashboard.html';
document.getElementById('appContainer').insertAdjacentHTML('afterbegin', renderSidebar('inventory'));

const alertBox = document.getElementById('alertBox');
let editingItemId = null;

function showAlert(message, type = 'error') {
  alertBox.className = `alert alert-${type}`;
  alertBox.innerHTML = message;
  alertBox.style.display = 'block';
  setTimeout(() => { alertBox.style.display = 'none'; }, 4000);
}

// ─── Estadisticas ─────────────────────────────────────────
async function loadStats() {
  try {
    const items = await apiRequest('/inventory');
    const total = items.length;
    const totalStock = items.reduce((sum, i) => sum + i.quantity, 0);
    const sinStock = items.filter(i => i.quantity === 0).length;

    document.getElementById('inventoryStats').innerHTML = `
      <div class="stat-card total">
        <div>
          <div class="number" data-count-to="${total}">${total}</div>
          <div class="label">Repuestos registrados</div>
        </div>
        <div class="stat-card__icon"><i class="fa-solid fa-boxes-stacked"></i></div>
      </div>
      <div class="stat-card" style="--stat-color:#166534">
        <div>
          <div class="number" data-count-to="${totalStock}">${totalStock}</div>
          <div class="label">Unidades en stock</div>
        </div>
        <div class="stat-card__icon"><i class="fa-solid fa-cubes"></i></div>
      </div>
      <div class="stat-card" style="--stat-color:#ef4444">
        <div>
          <div class="number" data-count-to="${sinStock}">${sinStock}</div>
          <div class="label">Sin stock</div>
        </div>
        <div class="stat-card__icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
      </div>
    `;
  } catch (error) {
    console.error('Error cargando estadisticas:', error);
  }
}

// ─── Cargar inventario ────────────────────────────────────
async function loadInventory() {
  try {
    const items = await apiRequest('/inventory');
    const tbody = document.getElementById('inventoryTableBody');

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px">No hay repuestos en el inventario</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(item => {
      const stockBadge = item.quantity === 0
        ? '<span class="badge badge-cancelada" style="font-size:10px">Sin stock</span>'
        : item.quantity <= 5
          ? `<span class="badge badge-atendida" style="font-size:10px">${item.quantity} uds</span>`
          : `<span class="badge badge-completada" style="font-size:10px">${item.quantity} uds</span>`;

      return `<tr>
        <td><code style="background:var(--bg-secondary);padding:3px 8px;border-radius:4px;font-size:12px">${item.code}</code></td>
        <td><strong>${item.name}</strong></td>
        <td>${stockBadge}</td>
        <td class="actions-cell">
          <button class="btn-icon btn-edit" onclick="openQuantityModal(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.quantity})" title="Actualizar cantidad"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon btn-delete" onclick="deleteItem(${item.id}, '${item.name.replace(/'/g, "\\'")}')" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
        </td>
      </tr>`;
    }).join('');
  } catch (error) {
    showAlert(error.message);
  }
}

// ─── Modal: Crear repuesto ────────────────────────────────
function openCreateModal() {
  editingItemId = null;
  document.getElementById('createForm').reset();
  document.getElementById('createSubmitBtn').textContent = 'Crear';
  document.getElementById('createModal').style.display = 'flex';
}

function closeCreateModal() {
  document.getElementById('createModal').style.display = 'none';
}

// ─── Modal: Actualizar cantidad ───────────────────────────
function openQuantityModal(id, name, currentQty) {
  editingItemId = id;
  document.getElementById('quantityItemName').value = name;
  document.getElementById('quantityInput').value = currentQty;
  document.getElementById('quantitySubmitBtn').textContent = 'Guardar';
  document.getElementById('quantityModal').style.display = 'flex';
}

function closeQuantityModal() {
  editingItemId = null;
  document.getElementById('quantityModal').style.display = 'none';
}

// ─── Crear repuesto ───────────────────────────────────────
document.getElementById('createForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('itemName').value.trim();
  const quantity = parseInt(document.getElementById('itemQuantity').value) || 0;

  const submitBtn = document.getElementById('createSubmitBtn');
  submitBtn.textContent = 'Creando...';
  submitBtn.disabled = true;

  try {
    await apiRequest('/inventory', 'POST', { name, quantity });
    showAlert(`Repuesto <strong>${name}</strong> creado exitosamente`, 'success');
    closeCreateModal();
    setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    showAlert(error.message);
    submitBtn.textContent = 'Crear';
    submitBtn.disabled = false;
  }
});

// ─── Actualizar cantidad ──────────────────────────────────
document.getElementById('quantityForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const quantity = parseInt(document.getElementById('quantityInput').value);
  const submitBtn = document.getElementById('quantitySubmitBtn');
  submitBtn.textContent = 'Guardando...';
  submitBtn.disabled = true;

  try {
    await apiRequest(`/inventory/${editingItemId}`, 'PATCH', { quantity });
    showAlert('Cantidad actualizada correctamente', 'success');
    closeQuantityModal();
    setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    showAlert(error.message);
    submitBtn.textContent = 'Guardar';
    submitBtn.disabled = false;
  }
});

// ─── Eliminar repuesto ────────────────────────────────────
async function deleteItem(id, name) {
  if (!confirm(`Estas seguro de eliminar "${name}"?\n\nEsta accion no se puede deshacer.`)) return;

  try {
    await apiRequest(`/inventory/${id}`, 'DELETE');
    showAlert(`Repuesto <strong>${name}</strong> eliminado`, 'success');
    setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    showAlert(error.message);
  }
}

// ─── Cerrar modales al hacer clic fuera ───────────────────
document.getElementById('createModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeCreateModal();
});
document.getElementById('quantityModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeQuantityModal();
});

// ─── Tecla ESC para cerrar modales ────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCreateModal();
    closeQuantityModal();
  }
});

// ─── Init ─────────────────────────────────────────────────
loadStats();
loadInventory();
