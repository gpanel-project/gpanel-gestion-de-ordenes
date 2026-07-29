// Si ya hay sesión activa, redirige al dashboard
if (localStorage.getItem('token')) {
  window.location.href = 'dashboard.html';
}

const loginForm = document.getElementById('loginForm');
const alertBox = document.getElementById('alertBox');
const loginBtn = document.getElementById('loginBtn');

function showAlert(message) {
  alertBox.textContent = message;
  alertBox.style.display = 'block';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  alertBox.style.display = 'none';
  loginBtn.textContent = 'Ingresando...';
  loginBtn.disabled = true;

  try {
    // Llamamos a /api/auth/login (no requiere token, por eso "false")
    const data = await apiRequest('/auth/login', 'POST', { email, password }, false);

    // Guardamos el token y los datos del usuario
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Redirigimos al dashboard
    window.location.href = 'dashboard.html';

  } catch (error) {
    showAlert(error.message);
    loginBtn.textContent = 'Iniciar sesión';
    loginBtn.disabled = false;
  }
});