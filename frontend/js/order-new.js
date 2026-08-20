const user = checkAuth();
document.getElementById('appContainer').insertAdjacentHTML('afterbegin', renderSidebar('order-new'));

const form = document.getElementById('newOrderForm');
const errorAlert = document.getElementById('errorAlert');
const successAlert = document.getElementById('successAlert');
const submitBtn = document.getElementById('submitBtn');
const imageDropzone = document.getElementById('imageDropzone');
const imageInput = document.getElementById('imageInput');
const imagePreviewGrid = document.getElementById('imagePreviewGrid');

let selectedFiles = [];

function hideAlerts() {
  errorAlert.style.display = 'none';
  successAlert.style.display = 'none';
}

function showAlert(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

// ─── Drag & Drop + click para seleccionar ───────────────────
imageDropzone.addEventListener('click', () => imageInput.click());

imageDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  imageDropzone.classList.add('is-dragover');
});
imageDropzone.addEventListener('dragleave', () => {
  imageDropzone.classList.remove('is-dragover');
});
imageDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  imageDropzone.classList.remove('is-dragover');
  addFiles(e.dataTransfer.files);
});

imageInput.addEventListener('change', (e) => {
  addFiles(e.target.files);
  imageInput.value = '';
});

function addFiles(fileList) {
  Array.from(fileList).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      showAlert(errorAlert, `"${file.name}" supera los 5MB.`);
      return;
    }
    if (selectedFiles.length >= 5) {
      showAlert(errorAlert, 'Maximo 5 imagenes por orden.');
      return;
    }
    selectedFiles.push(file);
  });
  renderPreviews();
}

function renderPreviews() {
  imagePreviewGrid.innerHTML = '';
  selectedFiles.forEach((file, idx) => {
    const div = document.createElement('div');
    div.className = 'image-preview-item';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    div.appendChild(img);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'image-preview-remove';
    btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    btn.addEventListener('click', () => {
      selectedFiles.splice(idx, 1);
      renderPreviews();
    });
    div.appendChild(btn);

    imagePreviewGrid.appendChild(div);
  });
}

// ─── Enviar formulario ──────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlerts();

  const deviceType = document.getElementById('deviceType').value;
  const description = document.getElementById('description').value.trim();

  if (!deviceType) {
    showAlert(errorAlert, 'Debes seleccionar un tipo de dispositivo.');
    return;
  }
  if (description.length < 10) {
    showAlert(errorAlert, 'Describe el problema con un poco mas de detalle (minimo 10 caracteres).');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';

  try {
    // 1. Crear la orden
    const result = await apiRequest('/orders', 'POST', { description, device_type: deviceType });

    // 2. Subir imagenes si las hay
    if (selectedFiles.length > 0) {
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo imagenes...';
      const token = localStorage.getItem('token');

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('image', file);

        await fetch(`${API_URL}/orders/${result.id}/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      }
    }

    showAlert(successAlert, `Orden ${result.order_number} generada exitosamente! Redirigiendo...`);
    form.reset();
    selectedFiles = [];
    renderPreviews();
    setTimeout(() => { window.location.href = 'client-dashboard.html'; }, 1500);
  } catch (error) {
    showAlert(errorAlert, error.message || 'No se pudo generar la orden.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Generar Orden';
  }
});
