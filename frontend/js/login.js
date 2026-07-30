// Si ya hay sesión activa, redirige al dashboard
if (localStorage.getItem('token')) {
  window.location.href = 'dashboard.html';
}

const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const alertBox = document.getElementById('alertBox');

function showAlert(message, type = 'error') {
  alertBox.className = `alert alert-${type}`;
  if (message.includes('<')) {
    alertBox.innerHTML = message;
  } else {
    alertBox.textContent = message;
  }
  alertBox.style.display = 'block';
}

// ── Detectar si viene redirigido desde el registro (verify=sent) ──
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('verify') === 'sent') {
  const emailParam = urlParams.get('email') || '';
  showAlert(
    `✉️ Hemos enviado un código de verificación al correo <strong>${emailParam}</strong>.<br><br>
     <a href="auth.html?email=${encodeURIComponent(emailParam)}" class="btn btn-secondary"
        style="display:inline-block; padding:6px 14px; text-decoration:none; font-size:.85rem;">
       Ingresar código de autenticación &rarr;
     </a>`,
    'info'
  );
}

// ── Manejo del formulario de Login ──────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  alertBox.style.display = 'none';
  loginBtn.textContent = 'Ingresando...';
  loginBtn.disabled = true;

  try {
    const data = await apiRequest('/auth/login', 'POST', { email, password }, false);

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    window.location.href = 'dashboard.html';

  } catch (error) {
    showAlert(error.message);
    loginBtn.textContent = 'Iniciar sesión';
    loginBtn.disabled = false;
  }
});