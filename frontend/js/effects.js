/* =============================================================
   Premium Effects - Vanilla JS
   IIFE pattern, safe wrappers, no imports
   ============================================================= */
(function () {
  "use strict";

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  function initReveals() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-revealed");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -5% 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-revealed");
        }
      });
    }, 4000);
  }

  function runCountUp(el) {
    var target = parseFloat(el.dataset.countTo);
    if (isNaN(target) || target <= 0) return;
    var current = 0;
    var step = target / 30;
    var interval = setInterval(function () {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      el.textContent = Math.round(current);
    }, 30);
  }

  function initStatCountUp() {
    document.querySelectorAll("[data-count-to]").forEach(function (el) {
      if (el.dataset.counted) return;
      el.dataset.counted = "true";
      runCountUp(el);
    });
  }

  function watchDynamicCounters() {
    var observer = new MutationObserver(function () {
      safe(initStatCountUp, "initStatCountUp");
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function initCardTilt() {
    if (reduced || matchMedia("(hover: none)").matches) return;
    document.querySelectorAll(".stat-card, .detail-card").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--rx", (-y * 4).toFixed(1) + "deg");
        card.style.setProperty("--ry", (x * 4).toFixed(1) + "deg");
        // card.style.transform = "perspective(800px) rotateX(var(--rx)) rotateY(var(--ry))";
      });
      // card.addEventListener("mouseleave", function () {
      //   card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
      // });
    });
  }

  function initSmoothAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function boot() {
    safe(initReveals, "initReveals");
    safe(initStatCountUp, "initStatCountUp");
    safe(initCardTilt, "initCardTilt");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(watchDynamicCounters, "watchDynamicCounters");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();