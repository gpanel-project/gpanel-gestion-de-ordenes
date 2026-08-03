const user = checkAuth();
document.getElementById('appContainer').insertAdjacentHTML('afterbegin', renderSidebar('dashboard'));

async function loadStats() {
  try {
    const stats = await apiRequest('/orders/stats/summary');
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML =
      '<div class="stat-card total"><div><div class="number" data-count-to="' + stats.total + '">' + stats.total + '</div><div class="label">Total de ordenes</div></div><div class="stat-card__icon"><i class="fa-solid fa-list-check"></i></div></div>' +
      '<div class="stat-card pendiente"><div><div class="number" data-count-to="' + stats.pendientes + '">' + stats.pendientes + '</div><div class="label">Pendientes</div></div><div class="stat-card__icon"><i class="fa-solid fa-clock"></i></div></div>' +
      '<div class="stat-card en_progreso"><div><div class="number" data-count-to="' + stats.en_progreso + '">' + stats.en_progreso + '</div><div class="label">En progreso</div></div><div class="stat-card__icon"><i class="fa-solid fa-arrows-rotate"></i></div></div>' +
      '<div class="stat-card completada"><div><div class="number" data-count-to="' + stats.completadas + '">' + stats.completadas + '</div><div class="label">Completadas</div></div><div class="stat-card__icon"><i class="fa-solid fa-check"></i></div></div>' +
      '<div class="stat-card cancelada"><div><div class="number" data-count-to="' + stats.canceladas + '">' + stats.canceladas + '</div><div class="label">Canceladas</div></div><div class="stat-card__icon"><i class="fa-solid fa-xmark"></i></div></div>';
  } catch (error) {
    console.error('Error cargando estadisticas:', error);
  }
}

async function loadRecentOrders() {
  try {
    const orders = await apiRequest('/orders');
    const recent = orders.slice(0, 5);
    const tbody = document.getElementById('recentOrders');
    if (recent.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px">No hay ordenes registradas</td></tr>';
      return;
    }
    tbody.innerHTML = recent.map(function(o) {
      return '<tr><td><strong>' + o.order_number + '</strong></td><td>' + o.client_name + '</td><td>' + o.technician_name + '</td><td><span class="badge badge-' + o.status + '">' + o.status.replace('_', ' ') + '</span></td><td><a href="order-detail.html?id=' + o.id + '" class="btn btn-primary btn-sm">Ver</a></td></tr>';
    }).join('');
  } catch (error) {
    console.error('Error cargando ordenes:', error);
  }
}

/* ─── Métricas del dashboard (solo admin) ─────────────────── */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
Chart.defaults.animation = reducedMotion ? false : true;
Chart.defaults.font.family = "'Inter', 'Segoe UI', Arial, sans-serif";

const charts = {};
let dashboardData = null;

function chartThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  const get = (v) => styles.getPropertyValue(v).trim();
  return {
    ink:      get('--ink')      || '#1a1a2e',
    inkSoft:  get('--ink-soft')  || '#4a4a6a',
    inkMute:  get('--ink-mute')  || '#8888a0',
    line:     get('--line')     || 'rgba(26,26,46,0.08)',
    accent:   get('--accent')   || '#f97316',
    navyLight:get('--navy-light') || '#2a5298'
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(value || 0);
}

function destroyAllCharts() {
  Object.keys(charts).forEach((key) => {
    try { charts[key].destroy(); } catch (e) { /* ya destruido */ }
    delete charts[key];
  });
}

function setChartEmpty(canvas, message) {
  canvas.style.display = 'none';
  const parent = canvas.parentElement;
  let p = parent.querySelector('.chart-empty');
  if (!p) {
    p = document.createElement('p');
    p.className = 'chart-empty';
    parent.appendChild(p);
  }
  p.textContent = message;
}

function clearChartEmpty(canvas) {
  canvas.style.display = 'block';
  const p = canvas.parentElement.querySelector('.chart-empty');
  if (p) p.remove();
}

function renderSuccessRate(resumen) {
  const canvas = document.getElementById('successRateChart');
  const valueEl = document.getElementById('successRateValue');
  valueEl.textContent = resumen.tasaExito + '%';
  clearChartEmpty(canvas);
  const t = chartThemeColors();
  charts.successRate = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [resumen.tasaExito, Math.max(100 - resumen.tasaExito, 0)],
        backgroundColor: [t.accent, 'rgba(148,163,184,0.18)'],
        borderWidth: 0,
        borderRadius: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '78%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
}

function renderTopTecnicos(items) {
  const canvas = document.getElementById('topTecnicosChart');
  if (!items || items.length === 0) {
    destroyChart('topTecnicos');
    setChartEmpty(canvas, 'Aún no hay órdenes completadas');
    return;
  }
  clearChartEmpty(canvas);
  const t = chartThemeColors();
  charts.topTecnicos = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: items.map((i) => i.name),
      datasets: [{
        data: items.map((i) => i.completadas),
        backgroundColor: t.navyLight,
        hoverBackgroundColor: t.accent,
        borderRadius: 8,
        barThickness: 18
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ' ' + ctx.parsed.x + ' completadas' } }
      },
      scales: {
        x: { beginAtZero: true, ticks: { color: t.inkMute, precision: 0 }, grid: { color: t.line } },
        y: { ticks: { color: t.inkSoft }, grid: { display: false } }
      }
    }
  });
}

function renderTopClientes(items) {
  const canvas = document.getElementById('topClientesChart');
  if (!items || items.length === 0) {
    destroyChart('topClientes');
    setChartEmpty(canvas, 'Aún no hay clientes con órdenes');
    return;
  }
  clearChartEmpty(canvas);
  const t = chartThemeColors();
  charts.topClientes = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: items.map((i) => i.name),
      datasets: [{
        data: items.map((i) => i.total),
        backgroundColor: t.accent,
        hoverBackgroundColor: t.navyLight,
        borderRadius: 8,
        barThickness: 18
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const item = items[ctx.dataIndex];
              return ' ' + item.total + ' órdenes · ' + formatCurrency(item.ingresos);
            }
          }
        }
      },
      scales: {
        x: { beginAtZero: true, ticks: { color: t.inkMute, precision: 0 }, grid: { color: t.line } },
        y: { ticks: { color: t.inkSoft }, grid: { display: false } }
      }
    }
  });
}

function renderCargaTecnicos(items) {
  const canvas = document.getElementById('cargaTecnicosChart');
  if (!items || items.length === 0) {
    destroyChart('cargaTecnicos');
    setChartEmpty(canvas, 'Sin órdenes pendientes ni en progreso');
    return;
  }
  clearChartEmpty(canvas);
  const t = chartThemeColors();
  charts.cargaTecnicos = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: items.map((i) => i.name),
      datasets: [{
        data: items.map((i) => i.carga),
        backgroundColor: 'rgba(249,115,22,0.75)',
        hoverBackgroundColor: t.accent,
        borderRadius: 8,
        barThickness: 18
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ' ' + ctx.parsed.y + ' en carga' } }
      },
      scales: {
        x: { ticks: { color: t.inkSoft }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: t.inkMute, precision: 0 }, grid: { color: t.line } }
      }
    }
  });
}

function destroyChart(key) {
  if (charts[key]) {
    try { charts[key].destroy(); } catch (e) { /* noop */ }
    delete charts[key];
  }
}

function renderDashboardCharts(data) {
  renderSuccessRate(data.resumen);
  renderTopTecnicos(data.topTecnicos);
  renderTopClientes(data.topClientes);
  renderCargaTecnicos(data.cargaTecnicos);
}

async function loadDashboardMetrics() {
  if (user.role !== 'admin') return;
  const chartsGrid = document.getElementById('chartsGrid');
  if (!chartsGrid) return;

  if (!dashboardData) {
    try {
      dashboardData = await apiRequest('/orders/stats/dashboard');
    } catch (error) {
      console.error('Error cargando métricas del dashboard:', error);
      return;
    }
  }
  chartsGrid.style.display = 'grid';
  renderDashboardCharts(dashboardData);
}

// Re-render con los colores del tema activo al alternar claro/oscuro
new MutationObserver(() => {
  if (user.role !== 'admin' || !dashboardData) return;
  destroyAllCharts();
  renderDashboardCharts(dashboardData);
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

loadStats();
loadRecentOrders();
loadDashboardMetrics();
