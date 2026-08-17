const user = checkAuth();
document.getElementById('appContainer').insertAdjacentHTML('afterbegin', renderSidebar('order-new'));

const form = document.getElementById('newOrderForm');
const errorAlert = document.getElementById('errorAlert');
const successAlert = document.getElementById('successAlert');
const submitBtn = document.getElementById('submitBtn');

function hideAlerts() {
  errorAlert.style.display = 'none';
  successAlert.style.display = 'none';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlerts();

  const description = document.getElementById('description').value.trim();
  if (description.length < 10) {
    errorAlert.textContent = 'Describe el problema con un poco más de detalle (mínimo 10 caracteres).';
    errorAlert.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';

  try {
    const result = await apiRequest('/orders', 'POST', { description });
    successAlert.textContent = `¡Orden ${result.order_number} generada exitosamente! Redirigiendo...`;
    successAlert.style.display = 'block';
    form.reset();
    setTimeout(() => { window.location.href = 'client-dashboard.html'; }, 1500);
  } catch (error) {
    errorAlert.textContent = error.message || 'No se pudo generar la orden.';
    errorAlert.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Generar Orden';
  }
});
