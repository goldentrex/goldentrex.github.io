/* Site-wide enhancements: active nav link, theme toggle, footer year.
   The markup works without JS; this only enhances it. */
(function () {
  'use strict';

  var SUN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var MENU =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  var CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* ---- Active navigation link ---- */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.topbar__nav a').forEach(function (a) {
    var target = a.getAttribute('href');
    if (target === here || (here === 'index.html' && target === 'index.html')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---- Theme toggle ---- */
  var root = document.documentElement;

  function currentTheme() {
    if (root.classList.contains('dark')) return 'dark';
    if (root.classList.contains('light')) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme, persist) {
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    if (persist) {
      try {
        localStorage.setItem('theme', theme);
      } catch (e) {}
    }
    if (btn) {
      var isDark = theme === 'dark';
      btn.innerHTML = isDark ? SUN : MOON;
      btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.setAttribute('title', isDark ? 'Light theme' : 'Dark theme');
    }
  }

  var bar = document.querySelector('.topbar');
  var nav = document.querySelector('.topbar__nav');
  var btn = null;
  if (bar) {
    var controls = document.createElement('div');
    controls.className = 'topbar__controls';

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
    controls.appendChild(btn);

    if (nav) {
      if (!nav.id) nav.id = 'primary-nav';
      var menuBtn = document.createElement('button');
      menuBtn.type = 'button';
      menuBtn.className = 'nav-toggle';
      menuBtn.setAttribute('aria-label', 'Menu');
      menuBtn.setAttribute('aria-controls', nav.id);
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.innerHTML = MENU;

      var setMenu = function (open) {
        nav.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.innerHTML = open ? CLOSE : MENU;
      };
      menuBtn.addEventListener('click', function () {
        setMenu(!nav.classList.contains('is-open'));
      });
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) setMenu(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setMenu(false);
      });
      controls.appendChild(menuBtn);
    }

    bar.appendChild(controls);
    applyTheme(currentTheme(), false);
  }

  /* Keep in sync with the OS if the user has not made an explicit choice. */
  try {
    var stored = localStorage.getItem('theme');
    if (!stored && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        try {
          if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'dark' : 'light', false);
        } catch (err) {}
      });
    }
  } catch (e) {}

  /* ---- Footer year ---- */
  document.querySelectorAll('[data-current-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
