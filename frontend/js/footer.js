// ─── Footer de la aplicación ─────────────────────────────────
// Se inyecta al final del contenido principal de las páginas
// internas. En las páginas de autenticación no hay .main-content,
// así que no hace nada y evita errores 404 de un script faltante.
(function () {
  "use strict";

  function injectFooter() {
    const main = document.querySelector(".main-content");
    if (!main || document.querySelector(".app-footer")) return;

    const footer = document.createElement("footer");
    footer.className = "app-footer";
    footer.innerHTML = `
      <p>© ${new Date().getFullYear()} GPanel — Gestión de Órdenes de Mantenimiento</p>
      <p class="app-footer__version">v1.0.0</p>
    `;
    main.appendChild(footer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectFooter);
  } else {
    injectFooter();
  }
})();
