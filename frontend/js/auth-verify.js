// Si ya hay sesión activa, redirige al dashboard
if (localStorage.getItem('token')) {
  window.location.href = 'dashboard.html';
}

const verifyForm = document.getElementById('verifyForm');
const verifyBtn = document.getElementById('verifyBtn');
const alertBox = document.getElementById('alertBox');
const verifyEmailInput = document.getElementById('verifyEmail');
const verifyCodeInput = document.getElementById('verifyCode');

function showAlert(message, type = 'error') {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.style.display = 'block';
}

// Autocompletar email y código si vienen en la URL
// Funciona tanto con npx serve como con archivos estáticos
const urlParams = new URLSearchParams(window.location.search);
const emailParam = urlParams.get('email') || '';
const codeParam = urlParams.get('code') || '';

if (emailParam) verifyEmailInput.value = emailParam;
if (codeParam) verifyCodeInput.value = codeParam;

if (emailParam && codeParam) {
  showAlert('✨ Código cargado automáticamente. Haz clic en "Verificar y Activar Cuenta".', 'info');
} else if (emailParam) {
  showAlert(`📧 Ingresa el código de 6 dígitos enviado a ${emailParam}.`, 'info');
}

// ── Envío del formulario de verificación ──────────────────
verifyForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = verifyEmailInput.value.trim();
  const code = verifyCodeInput.value.trim();

  alertBox.style.display = 'none';
  verifyBtn.textContent = 'Verificando...';
  verifyBtn.disabled = true;

  try {
    const data = await apiRequest('/auth/verify-client', 'POST', { email, code }, false);

    showAlert(data.mensaje || '¡Cuenta verificada exitosamente!', 'success');

    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    // Redirigir al dashboard tras 1.5 segundos
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);

  } catch (error) {
    showAlert(error.message || 'Código inválido o expirado.');
    verifyBtn.textContent = 'Verificar y Activar Cuenta';
    verifyBtn.disabled = false;
  }
});
