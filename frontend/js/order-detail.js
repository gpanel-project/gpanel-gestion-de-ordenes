const user = checkAuth();

document.getElementById('appContainer').insertAdjacentHTML(
  'afterbegin',
  renderSidebar('orders')
);

// ─── Obtenemos el ID de la orden desde la URL ──────────────
// Ejemplo: order-detail.html?id=3  →  orderId = 3
const params = new URLSearchParams(window.location.search);
const orderId = params.get('id');

if (!orderId) {
  alert('No se especificó una orden');
  window.location.href = 'orders-list.html';
}

let currentOrder = null;

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
  document.getElementById('technicianName').textContent = order.technician_name;
  document.getElementById('createdAt').textContent = new Date(order.created_at).toLocaleString('es-CO');
  document.getElementById('totalCost').textContent = `$${Number(order.total_cost || 0).toLocaleString('es-CO')}`;
  document.getElementById('description').textContent = order.description || 'N/A';

  document.getElementById('orderStatus').innerHTML =
    `<span class="badge badge-${order.status}">${order.status.replace('_', ' ')}</span>`;

  // Llenamos el formulario de edición
  document.getElementById('diagnosis').value = order.diagnosis || '';
  document.getElementById('work_done').value = order.work_done || '';
  document.getElementById('parts_used').value = order.parts_used || '';
  document.getElementById('total_cost').value = order.total_cost || 0;
  document.getElementById('statusSelect').value = order.status;

  // ── Solo admin y técnico pueden editar ──────────────────
  if (user.role === 'cliente') {
    document.getElementById('editSection').style.display = 'none';
  }

  // ── Si ya tiene firma, la mostramos ─────────────────────
  if (order.signature_base64) {
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

    // 2. Actualizamos el estado (si cambió)
    await apiRequest(`/orders/${orderId}/status`, 'PATCH', {
      status: document.getElementById('statusSelect').value
    });

    showAlert('✅ Cambios guardados exitosamente');
    loadOrder();

  } catch (error) {
    alert('Error: ' + error.message);
  }
});

// ─── Configuramos el pad de firma ───────────────────────────
const canvas = document.getElementById('signatureCanvas');

// Ajustamos el tamaño real del canvas al tamaño visual
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
    // Convertimos el dibujo a base64
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

// ─── Descargar PDF (con token incluido) ─────────────────────
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
  const btn = document.getElementById('downloadPdfBtn');
  btn.textContent = 'Descargando...';
  btn.disabled = true;

  try {
    const token = localStorage.getItem('token');

    const response = await fetch(`http://localhost:3000/api/orders/${orderId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('No se pudo descargar el PDF');
    }

    // Convertimos la respuesta en un archivo descargable
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Creamos un link temporal e invisible para forzar la descarga
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
    btn.textContent = '📄 Descargar PDF';
    btn.disabled = false;
  }
});