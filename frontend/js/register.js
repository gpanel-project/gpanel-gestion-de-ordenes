if (localStorage.getItem('token')) {
  window.location.href = 'dashboard.html';
}

const registerForm = document.getElementById('registerForm');
const alertBox = document.getElementById('alertBox');
const registerBtn = document.getElementById('registerBtn');

function showAlert(message, type = 'error') {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.style.display = 'block';
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const company = document.getElementById('company').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;

  alertBox.style.display = 'none';
  registerBtn.textContent = 'Registrando...';
  registerBtn.disabled = true;

  try {
    const data = await apiRequest('/auth/register/client', 'POST', {
      name, email, password,
      company: company || undefined,
      phone: phone || undefined,
      address: address || undefined
    }, false);

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    window.location.href = 'dashboard.html';

  } catch (error) {
    showAlert(error.message);
    registerBtn.textContent = 'Crear cuenta';
    registerBtn.disabled = false;
  }
});
