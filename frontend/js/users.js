const user = checkAuth();
if (user.role !== 'admin') window.location.href = 'dashboard.html';
document.getElementById('appContainer').insertAdjacentHTML('afterbegin', renderSidebar('users'));

const alertBox = document.getElementById('alertBox');
let editingUserId = null;

function showAlert(message, type = 'error') {
  alertBox.className = `alert alert-${type}`;
  alertBox.innerHTML = message;
  alertBox.style.display = 'block';
  setTimeout(() => { alertBox.style.display = 'none'; }, 4000);
}

// ─── Cargar estadísticas de usuarios ──────────────────────
async function loadUserStats() {
  try {
    const stats = await apiRequest('/users/stats');
    const grid = document.getElementById('userStatsGrid');
    grid.innerHTML = `
      <div class="stat-card total">
        <div>
          <div class="number" data-count-to="${stats.total}">${stats.total}</div>
          <div class="label">Total usuarios</div>
        </div>
        <div class="stat-card__icon"><i class="fa-solid fa-users"></i></div>
      </div>
      <div class="stat-card" style="--stat-color:var(--navy-dark)">
        <div>
          <div class="number" data-count-to="${stats.admins}">${stats.admins}</div>
          <div class="label">Administradores</div>
        </div>
        <div class="stat-card__icon"><i class="fa-solid fa-user-shield"></i></div>
      </div>
      <div class="stat-card" style="--stat-color:#c2410c">
        <div>
          <div class="number" data-count-to="${stats.tecnicos}">${stats.tecnicos}</div>
          <div class="label">Técnicos</div>
        </div>
        <div class="stat-card__icon"><i class="fa-solid fa-user-gear"></i></div>
      </div>
      <div class="stat-card" style="--stat-color:#1e40af">
        <div>
          <div class="number" data-count-to="${stats.clientes}">${stats.clientes}</div>
          <div class="label">Clientes</div>
        </div>
        <div class="stat-card__icon"><i class="fa-solid fa-address-card"></i></div>
      </div>
      <div class="stat-card" style="--stat-color:#22c55e">
        <div>
          <div class="number" data-count-to="${stats.activos}">${stats.activos}</div>
          <div class="label">Usuarios activos</div>
        </div>
        <div class="stat-card__icon"><i class="fa-solid fa-user-check"></i></div>
      </div>
      <div class="stat-card" style="--stat-color:#ef4444">
        <div>
          <div class="number" data-count-to="${stats.pendientes}">${stats.pendientes}</div>
          <div class="label">Pendientes de verificación</div>
        </div>
        <div class="stat-card__icon"><i class="fa-solid fa-user-clock"></i></div>
      </div>
    `;
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

// ─── Cargar usuarios ──────────────────────────────────────
async function loadUsers() {
  try {
    const users = await apiRequest('/users');
    const tbody = document.getElementById('usersTableBody');

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px">No hay usuarios registrados</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const roleLabel = { admin: 'Admin', tecnico: 'Técnico', cliente: 'Cliente' }[u.role] || u.role;
      const statusBadge = u.active
        ? '<span class="badge badge-completada" style="font-size:10px">Activo</span>'
        : '<span class="badge badge-cancelada" style="font-size:10px">Inactivo</span>';
      const canEdit = u.role === 'tecnico';
      const canDelete = u.role === 'tecnico' || u.role === 'cliente';
      return `<tr>
        <td>${u.id}</td>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge badge-${u.role}">${roleLabel}</span></td>
        <td>${statusBadge}</td>
        <td class="actions-cell">
          ${canEdit ? `<button class="btn-icon btn-edit" onclick="openEditModal(${u.id}, '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${u.role}', ${u.active})" title="Editar"><i class="fa-solid fa-pen"></i></button>` : ''}
          ${canDelete ? `<button class="btn-icon btn-delete" onclick="deleteUser(${u.id}, '${u.name.replace(/'/g, "\\'")}')" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>` : ''}
          ${!canEdit && !canDelete ? '<span class="text-mute">—</span>' : ''}
        </td>
      </tr>`;
    }).join('');
  } catch (error) {
    showAlert(error.message);
  }
}

// ─── Modal ─────────────────────────────────────────────────
function openCreateModal() {
  editingUserId = null;
  document.getElementById('modalTitle').textContent = 'Nuevo Técnico';
  document.getElementById('userForm').reset();
  document.getElementById('passwordGroup').style.display = 'block';
  document.getElementById('userPassword').required = true;
  document.getElementById('activeGroup').style.display = 'none';
  document.getElementById('modalSubmitBtn').textContent = 'Crear Técnico';
  document.getElementById('userModal').style.display = 'flex';
}

function openEditModal(id, name, email, role, active) {
  editingUserId = id;
  document.getElementById('modalTitle').textContent = 'Editar Técnico';
  document.getElementById('userName').value = name;
  document.getElementById('userEmail').value = email;
  document.getElementById('userRole').value = role;
  document.getElementById('userActive').value = active ? 'true' : 'false';
  document.getElementById('passwordGroup').style.display = 'block';
  document.getElementById('userPassword').required = false;
  document.getElementById('userPassword').value = '';
  document.getElementById('activeGroup').style.display = 'block';
  document.getElementById('modalSubmitBtn').textContent = 'Guardar cambios';
  document.getElementById('userModal').style.display = 'flex';
}

function closeModal() {
  editingUserId = null;
  document.getElementById('userModal').style.display = 'none';
}

// ─── Crear / Editar usuario ───────────────────────────────
document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('userName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const password = document.getElementById('userPassword').value;
  const role = 'tecnico';
  const active = document.getElementById('userActive').value === 'true';

  const submitBtn = document.getElementById('modalSubmitBtn');
  submitBtn.textContent = 'Guardando...';
  submitBtn.disabled = true;

  try {
    if (editingUserId) {
      await apiRequest(`/users/${editingUserId}`, 'PUT', { name, email, role, active });
      showAlert(`✅ Técnico <strong>${name}</strong> actualizado correctamente`, 'success');
    } else {
      if (!password || password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      await apiRequest('/users', 'POST', { name, email, password, role });
      showAlert(`✅ Técnico <strong>${name}</strong> creado exitosamente`, 'success');
    }
    closeModal();
    // Recargamos la página para refrescar las métricas (stat-card) y la tabla
    setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    showAlert(error.message);
    submitBtn.textContent = editingUserId ? 'Guardar cambios' : 'Crear Técnico';
    submitBtn.disabled = false;
  }
});

// ─── Eliminar usuario ─────────────────────────────────────
async function deleteUser(id, name) {
  if (!confirm(`¿Estás seguro de eliminar a "${name}"?\n\nEsta acción no se puede deshacer.`)) return;

  try {
    await apiRequest(`/users/${id}`, 'DELETE');
    showAlert(`🗑️ Usuario <strong>${name}</strong> eliminado`, 'success');
    // Recargamos la página para refrescar las métricas (stat-card) y la tabla
    setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    showAlert(error.message);
  }
}

// ─── Cerrar modal al hacer clic fuera ─────────────────────
document.getElementById('userModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// ─── Init ─────────────────────────────────────────────────
loadUserStats();
loadUsers();

// ─── Tecla ESC para cerrar modal ──────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
