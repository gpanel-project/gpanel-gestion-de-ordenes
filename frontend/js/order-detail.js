const user = checkAuth();

document.getElementById('appContainer').insertAdjacentHTML(
  'afterbegin',
  renderSidebar('orders')
);

// ─── Obtenemos el ID de la orden desde la URL ──────────────
const params = new URLSearchParams(window.location.search);
const orderId = params.get('id');

if (!orderId) {
  alert('No se especificó una orden');
  window.location.href = 'orders-list.html';
}

let currentOrder = null;
let availableParts = [];

// ─── Cargamos los datos de la orden ────────────────────────
async function loadOrder() {
  try {
    currentOrder = await apiRequest(`/orders/${orderId}`);
    renderOrder(currentOrder);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ─── Mostramos los datos en pantalla ───────────────────────
function renderOrder(order) {
  document.getElementById('orderTitle').textContent = `Orden ${order.order_number}`;
  document.getElementById('clientName').textContent = order.client_name;
  document.getElementById('clientCompany').textContent = order.client_company || 'N/A';
  document.getElementById('clientAddress').textContent = order.client_address || 'N/A';
  document.getElementById('deviceType').textContent = order.device_type || 'N/A';
  document.getElementById('technicianName').textContent = order.technician_name || 'Sin asignar';
  document.getElementById('createdAt').textContent = new Date(order.created_at).toLocaleString('es-CO');
  document.getElementById('totalCost').textContent = `$${Number(order.total_cost || 0).toLocaleString('es-CO')}`;
  document.getElementById('description').textContent = order.description || 'N/A';

  document.getElementById('orderStatus').innerHTML =
    `<span class="badge badge-${order.status}">${order.status.replace('_', ' ')}</span>`;

  // ── Llenamos el formulario de edición ──────────────────
  document.getElementById('diagnosis').value = order.diagnosis || '';
  document.getElementById('work_done').value = order.work_done || '';
  document.getElementById('parts_used').value = order.parts_used || '';
  document.getElementById('total_cost').value = order.total_cost || 0;
  document.getElementById('statusSelect').value = order.status;

  // ── VISIBILIDAD SEGÚN ROL ──────────────────────────────
  const editSection = document.getElementById('editSection');
  const signatureSection = document.getElementById('signatureSection');
  const assignSection = document.getElementById('assignSection');
  const statusSelect = document.getElementById('statusSelect');
  const statusLockedHint = document.getElementById('statusLockedHint');

  // Resetear opciones del select de estado
  Array.from(statusSelect.options).forEach(opt => { opt.hidden = false; opt.disabled = false; });

  if (user.role === 'admin') {
    // Admin: solo visualiza, NO edita ni firma
    editSection.style.display = 'none';
    signatureSection.style.display = 'none';

    // Admin puede asignar técnico solo si la orden está pendiente
    if (order.status === 'pendiente') {
      assignSection.style.display = 'block';
      loadTechnicians();
    } else {
      assignSection.style.display = 'none';
    }

    // Admin no cambia estados, deshabilitamos el select
    statusSelect.disabled = true;
  } else if (user.role === 'cliente') {
    // Cliente: solo visualiza
    editSection.style.display = 'none';
    assignSection.style.display = 'none';
    statusSelect.disabled = true;

    // Cliente firma solo si la orden está atendida y no tiene firma aún
    if (order.status === 'atendida' && !order.signature_base64) {
      signatureSection.style.display = 'block';
    } else {
      signatureSection.style.display = 'none';
    }
  } else if (user.role === 'tecnico') {
    // Técnico: solo puede editar (no firma)
    assignSection.style.display = 'none';
    signatureSection.style.display = 'none';

    // Técnico edita solo sus órdenes asignadas y solo si está EN PROGRESO
    if (order.technician_id === user.id && order.status === 'en_progreso') {
      editSection.style.display = 'block';
      statusSelect.disabled = false;

      // Técnico solo puede cambiar a "atendida"
      Array.from(statusSelect.options).forEach(opt => {
        if (opt.value !== 'atendida') {
          opt.hidden = true;
          opt.disabled = true;
        }
      });
      statusSelect.value = 'atendida';

      if (statusLockedHint) statusLockedHint.style.display = 'none';

      // Mostrar selector de repuestos del inventario
      document.getElementById('partsInventoryGroup').style.display = 'block';
      loadAvailableParts();
    } else {
      editSection.style.display = 'none';
    }
  }

  // ── Si ya tiene firma, la mostramos ─────────────────────
  if (order.signature_base64) {
    signatureSection.style.display = 'block';
    document.getElementById('signatureDisplay').style.display = 'block';
    document.getElementById('signaturePadContainer').style.display = 'none';
    document.getElementById('signatureImg').src = order.signature_base64;
    document.getElementById('signatureDate').textContent =
      new Date(order.signature_date).toLocaleString('es-CO');
  }

  // ── Si ya tiene PDF, mostramos el botón de descarga ─────
  if (order.pdf_path) {
    document.getElementById('pdfSection').style.display = 'block';
  }
}

// ─── Cargar técnicos disponibles (solo admin) ──────────────
async function loadTechnicians() {
  try {
    const techs = await apiRequest('/orders/technicians/list');
    const select = document.getElementById('technicianSelect');
    select.innerHTML = '<option value="">-- Seleccionar tecnico --</option>';
    techs.forEach(tech => {
      select.innerHTML += `<option value="${tech.id}">${tech.name} (${tech.email})</option>`;
    });
  } catch (error) {
    console.error('Error cargando técnicos:', error);
  }
}

// ─── Cargar repuestos disponibles del inventario ───────────
async function loadAvailableParts() {
  try {
    availableParts = await apiRequest('/inventory/available');
    renderPartsSelector();
  } catch (error) {
    console.error('Error cargando inventario:', error);
  }
}

function renderPartsSelector() {
  const container = document.getElementById('inventoryPartsSelector');
  if (availableParts.length === 0) {
    container.innerHTML = '<p style="color:var(--ink-mute);font-size:13px">No hay repuestos disponibles en inventario</p>';
    return;
  }

  container.innerHTML = availableParts.map(part => `
    <div class="inventory-part-row">
      <label class="inventory-part-check">
        <input type="checkbox" class="part-checkbox" data-id="${part.id}" data-max="${part.quantity}">
        <span class="part-info">
          <span class="part-name">${part.name}</span>
          <span class="part-code">${part.code}</span>
          <span class="part-stock">Stock: ${part.quantity}</span>
        </span>
      </label>
      <input type="number" class="part-qty-input" data-id="${part.id}" min="1" max="${part.quantity}" value="1" disabled>
    </div>
  `).join('');

  // Habilitar/deshabilitar inputs de cantidad segun checkbox
  container.querySelectorAll('.part-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const qtyInput = container.querySelector(`.part-qty-input[data-id="${cb.dataset.id}"]`);
      qtyInput.disabled = !cb.checked;
      if (cb.checked) {
        qtyInput.focus();
      } else {
        qtyInput.value = 1;
      }
    });
  });
}

function getSelectedParts() {
  const parts = [];
  document.querySelectorAll('.part-checkbox:checked').forEach(cb => {
    const id = parseInt(cb.dataset.id);
    const qtyInput = document.querySelector(`.part-qty-input[data-id="${id}"]`);
    const qty = parseInt(qtyInput.value);
    if (qty > 0) {
      parts.push({ inventory_id: id, quantity_used: qty });
    }
  });
  return parts;
}

// ─── Asignar técnico a la orden (solo admin) ───────────────
document.getElementById('assignForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const techId = document.getElementById('technicianSelect').value;
  if (!techId) {
    alert('Debe seleccionar un técnico');
    return;
  }

  try {
    await apiRequest(`/orders/${orderId}/assign`, 'PATCH', { technician_id: parseInt(techId) });
    showAlert('✅ Técnico asignado exitosamente');
    loadOrder();
  } catch (error) {
    alert('Error: ' + error.message);
  }
});

// ─── Guardar cambios (diagnóstico, trabajo, costo, estado) ─
document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    // 1. Actualizamos los detalles
    await apiRequest(`/orders/${orderId}`, 'PUT', {
      diagnosis: document.getElementById('diagnosis').value,
      work_done: document.getElementById('work_done').value,
      parts_used: document.getElementById('parts_used').value,
      total_cost: document.getElementById('total_cost').value
    });

    // 2. Actualizamos el estado (solo si cambió; en completadas/canceladas queda bloqueado)
    const newStatus = document.getElementById('statusSelect').value;
    if (newStatus !== currentOrder.status) {
      const payload = { status: newStatus };

      // Si el tecnico marca como atendida, enviamos los repuestos seleccionados
      if (newStatus === 'atendida' && user.role === 'tecnico') {
        const selectedParts = getSelectedParts();
        if (selectedParts.length > 0) {
          payload.parts_used = selectedParts;
        }
      }

      await apiRequest(`/orders/${orderId}/status`, 'PATCH', payload);
    }

    showAlert('Cambios guardados exitosamente');
    loadOrder();

  } catch (error) {
    alert('Error: ' + error.message);
  }
});

// ─── Configuramos el pad de firma ───────────────────────────
const canvas = document.getElementById('signatureCanvas');

function resizeCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  canvas.getContext('2d').scale(ratio, ratio);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const signaturePad = new SignaturePad(canvas, {
  backgroundColor: 'rgb(255, 255, 255)'
});

// ─── Botón limpiar firma ─────────────────────────────────────
document.getElementById('clearSignature').addEventListener('click', () => {
  signaturePad.clear();
});

// ─── Botón guardar firma ─────────────────────────────────────
document.getElementById('saveSignature').addEventListener('click', async () => {
  if (signaturePad.isEmpty()) {
    alert('Por favor dibuje la firma antes de guardar');
    return;
  }

  const signatureBtn = document.getElementById('saveSignature');
  signatureBtn.textContent = 'Guardando...';
  signatureBtn.disabled = true;

  try {
    const signatureData = signaturePad.toDataURL('image/png');

    await apiRequest(`/orders/${orderId}/signature`, 'POST', {
      signature_base64: signatureData
    });

    showAlert('✅ Firma guardada, PDF generado y correo enviado exitosamente');
    loadOrder();

  } catch (error) {
    alert('Error: ' + error.message);
    signatureBtn.textContent = 'Guardar firma y enviar correo';
    signatureBtn.disabled = false;
  }
});

// ─── Mostrar mensaje de éxito ────────────────────────────────
function showAlert(message) {
  const alertBox = document.getElementById('alertBox');
  alertBox.textContent = message;
  alertBox.style.display = 'block';
  setTimeout(() => { alertBox.style.display = 'none'; }, 4000);
}

loadOrder();

// ─── Cargar imágenes adjuntas de la orden ────────────────────
async function loadImages() {
  try {
    const images = await apiRequest(`/orders/${orderId}/images`);
    const section = document.getElementById('imagesSection');
    const grid = document.getElementById('detailImagesGrid');

    if (images.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    grid.innerHTML = images.map(img =>
      `<a href="${img.image_url}" target="_blank" rel="noopener">
        <img src="${img.image_url}" alt="Adjunto de orden" loading="lazy">
      </a>`
    ).join('');
  } catch (error) {
    console.error('Error cargando imagenes:', error);
  }
}
loadImages();

// ─── Descargar PDF (con token incluido) ─────────────────────
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
  const btn = document.getElementById('downloadPdfBtn');
  btn.textContent = 'Descargando...';
  btn.disabled = true;

  try {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/orders/${orderId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('No se pudo descargar el PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentOrder.order_number}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    btn.textContent = 'Descargar PDF';
    btn.disabled = false;
  }
});