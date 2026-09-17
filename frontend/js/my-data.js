const user = checkAuth();
if (user && user.role !== 'cliente') {
  window.location.href = 'dashboard.html';
}

document.getElementById('appContainer').insertAdjacentHTML('afterbegin', renderSidebar('my-data'));

const alertBox = document.getElementById('alertBox');

function showAlert(message, type = 'success', isHtml = false) {
  alertBox.className = `alert alert-${type}`;
  if (isHtml) {
    alertBox.innerHTML = message;
  } else {
    alertBox.textContent = message;
  }
  alertBox.style.display = 'block';
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideAlert() {
  alertBox.style.display = 'none';
}

// ─── Cargar los datos del perfil del cliente ────────────────
async function loadProfile() {
  try {
    const profile = await apiRequest('/users/profile');
    document.getElementById('profileName').value = profile.name || '';
    document.getElementById('profileEmail').value = profile.email || '';
    document.getElementById('profileCompany').value = profile.company || '';
    document.getElementById('profilePhone').value = profile.phone || '';
    document.getElementById('profileAddress').value = profile.address || '';
  } catch (error) {
    showAlert(error.message, 'error');
  }
}

// ─── Guardar datos personales (sin email) ───────────────────
document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const name = document.getElementById('profileName').value.trim();
  const company = document.getElementById('profileCompany').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const address = document.getElementById('profileAddress').value.trim();

  const btn = document.getElementById('profileSaveBtn');
  btn.textContent = 'Guardando...';
  btn.disabled = true;

  try {
    await apiRequest('/users/profile', 'PUT', {
      name, company: company || undefined, phone: phone || undefined, address: address || undefined
    });

    // Actualizamos el nombre en localStorage para que la sidebar lo refleje
    const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (savedUser) {
      savedUser.name = name;
      localStorage.setItem('user', JSON.stringify(savedUser));
    }

    showAlert('<strong>Tus datos se actualizaron correctamente.</strong>', 'success', true);
    loadProfile();
  } catch (error) {
    showAlert(error.message, 'error');
  } finally {
    btn.textContent = 'Guardar datos';
    btn.disabled = false;
  }
});

// ─── Paso 1: solicitar cambio de contraseña ─────────────────
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const current_password = document.getElementById('currentPassword').value;
  const new_password = document.getElementById('newPassword').value;
  const confirm_password = document.getElementById('newPasswordConfirm').value;

  if (new_password !== confirm_password) {
    showAlert('Las contraseñas nuevas no coinciden.', 'error');
    return;
  }

  const btn = document.getElementById('passwordSendBtn');
  btn.textContent = 'Enviando código...';
  btn.disabled = true;

  try {
    await apiRequest('/auth/request-password-change', 'POST', { current_password, new_password });

    // Mostramos el paso 2 (ingresar el código)
    document.getElementById('passwordVerifySection').style.display = 'block';
    document.getElementById('verifyCode').focus();
    showAlert('Código de verificación enviado a tu correo. Revisa tu bandeja de entrada (es válido por 20 minutos).', 'info', true);

    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newPasswordConfirm').value = '';
  } catch (error) {
    showAlert(error.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar codigo de verificacion';
    btn.disabled = false;
  }
});

// ─── Paso 2: verificar código y aplicar el cambio ─────────────
document.getElementById('verifyPasswordBtn').addEventListener('click', async () => {
  hideAlert();

  const code = document.getElementById('verifyCode').value.trim();
  if (!code) {
    showAlert('Ingresa el código de verificación que recibiste por correo.', 'error');
    return;
  }

  const btn = document.getElementById('verifyPasswordBtn');
  btn.textContent = 'Verificando...';
  btn.disabled = true;

  try {
    await apiRequest('/auth/verify-password-change', 'POST', { code });

    showAlert('✅ <strong>Tu contraseña se actualizó exitosamente.</strong>', 'success', true);
    document.getElementById('passwordVerifySection').style.display = 'none';
    document.getElementById('verifyCode').value = '';
  } catch (error) {
    showAlert(error.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Confirmar cambio de contraseña';
    btn.disabled = false;
  }
});

// ─── Cargar el código automáticamente si viene del email ─────
const urlParams = new URLSearchParams(window.location.search);
const codeParam = urlParams.get('code') || '';
if (codeParam) {
  document.getElementById('passwordVerifySection').style.display = 'block';
  document.getElementById('verifyCode').value = codeParam;
  showAlert('✨ Código cargado desde el enlace. Haz clic en "<strong>Confirmar cambio de contraseña</strong>".', 'info', true);
}

loadProfile();