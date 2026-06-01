/* Theme toggle (Light / Dark / Auto) with persistence. */
(function initThemeToggle() {
  const KEY = 'zc-theme';
  const root = document.documentElement;
  const prefersDarkMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function getSavedTheme() {
    try {
      const v = localStorage.getItem(KEY);
      // Premier lancement (aucune clé): sombre par défaut.
      if (v === null) return 'dark';
      return v === 'light' || v === 'dark' ? v : 'dark';
    } catch (_) {
      return 'dark';
    }
  }

  function saveTheme(mode) {
    try {
      if (mode === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, mode);
    } catch (_) { }
  }

  function getEffectiveTheme(mode) {
    if (mode === 'dark' || mode === 'light') return mode;
    return prefersDarkMq && prefersDarkMq.matches ? 'dark' : 'light';
  }

  function applyTheme(mode) {
    const safeMode = mode === 'dark' || mode === 'light' ? mode : 'auto';
    if (safeMode === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', safeMode);
    const effective = getEffectiveTheme(safeMode);
    root.style.colorScheme = effective;
    root.setAttribute('data-theme-mode', safeMode);
    updateThemeButton(safeMode, effective);
  }

  function getLangKey() {
    const raw = String((localStorage.getItem('uiLang') || root.getAttribute('lang') || 'fr')).toLowerCase();
    if (raw.startsWith('ar')) return 'ar';
    if (raw.startsWith('en')) return 'en';
    if (raw.startsWith('kab')) return 'kab';
    if (raw.startsWith('es')) return 'es';
    return 'fr';
  }

  function labels(mode, effective) {
    const isDark = effective === 'dark';
    const icon = isDark ? 'fa-moon' : 'fa-sun';
    const L = getLangKey();
    const byLang = {
      fr: {
        auto: 'Thème auto',
        dark: 'Thème sombre',
        light: 'Thème clair',
        title: isDark ? 'Passer au thème clair' : 'Passer au thème sombre'
      },
      en: {
        auto: 'Theme auto',
        dark: 'Dark theme',
        light: 'Light theme',
        title: isDark ? 'Switch to light theme' : 'Switch to dark theme'
      },
      ar: {
        auto: 'السمة تلقائي',
        dark: 'السمة الداكنة',
        light: 'السمة الفاتحة',
        title: isDark ? 'التبديل إلى السمة الفاتحة' : 'التبديل إلى السمة الداكنة'
      },
      kab: {
        auto: 'Asentel awurman',
        dark: 'Asentel aberkan',
        light: 'Asentel aceɛlal',
        title: isDark ? 'Beddel ɣer usentel aceɛlal' : 'Beddel ɣer usentel aberkan'
      },
      es: {
        auto: 'Tema auto',
        dark: 'Tema oscuro',
        light: 'Tema claro',
        title: isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
      }
    };
    const t = byLang[L] || byLang.fr;
    return {
      text: t[mode] || t.auto,
      title: t.title,
      iconClass: icon
    };
  }

  function statusText(mode, effective) {
    const L = getLangKey();
    const byLang = {
      fr: {
        dark: 'Thème: sombre',
        light: 'Thème: clair',
        autoDark: 'Thème: auto (système sombre)',
        autoLight: 'Thème: auto (système clair)'
      },
      en: {
        dark: 'Theme: dark',
        light: 'Theme: light',
        autoDark: 'Theme: auto (system dark)',
        autoLight: 'Theme: auto (system light)'
      },
      ar: {
        dark: 'السمة: داكنة',
        light: 'السمة: فاتحة',
        autoDark: 'السمة: تلقائي (النظام داكن)',
        autoLight: 'السمة: تلقائي (النظام فاتح)'
      },
      kab: {
        dark: 'Asentel: aberkan',
        light: 'Asentel: aceɛlal',
        autoDark: 'Asentel: awurman (anagraw aberkan)',
        autoLight: 'Asentel: awurman (anagraw aceɛlal)'
      },
      es: {
        dark: 'Tema: oscuro',
        light: 'Tema: claro',
        autoDark: 'Tema: auto (sistema oscuro)',
        autoLight: 'Tema: auto (sistema claro)'
      }
    };
    const t = byLang[L] || byLang.fr;
    if (mode === 'dark') return t.dark;
    if (mode === 'light') return t.light;
    return effective === 'dark' ? t.autoDark : t.autoLight;
  }

  function showThemeStatusTmp(message) {
    const bringToFront = (el) => {
      if (!el) return;
      try {
        if (typeof window.getNextZIndex === 'function') {
          const z = Number(window.getNextZIndex());
          if (Number.isFinite(z) && z > 0) {
            el.style.zIndex = String(z);
            return;
          }
        }
      } catch (_) { }
      let max = 0;
      try {
        const all = document.body ? document.body.querySelectorAll('*') : [];
        for (let i = 0; i < all.length; i++) {
          const z = parseInt(window.getComputedStyle(all[i]).zIndex, 10);
          if (!Number.isNaN(z) && z > max) max = z;
        }
      } catch (_) { }
      el.style.zIndex = String(max + 2);
    };
    try {
      if (typeof window.alertMsgBoxTemp === 'function') {
        window.alertMsgBoxTemp(message, 'green', 1800);
        return;
      }
    } catch (_) { }
    let el = document.getElementById('zcThemeTmpMsg');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zcThemeTmpMsg';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:14px',
        'transform:translateX(-50%)',
        'background:var(--zc-ui-soft-bg,#f8fafc)',
        'color:var(--zc-text,#0f172a)',
        'border:1px solid var(--zc-border,#cbd5e1)',
        'border-radius:10px',
        'padding:6px 10px',
        'font-size:12px',
        'box-shadow:0 6px 16px rgba(0,0,0,.14)'
      ].join(';');
      document.body.appendChild(el);
    }
    bringToFront(el);
    el.textContent = message;
    clearTimeout(showThemeStatusTmp._timer);
    showThemeStatusTmp._timer = setTimeout(() => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 1800);
  }

  function updateThemeButton(mode, effective) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const text = document.getElementById('themeToggleLabel');
    const ico = btn.querySelector('.zc-top-action-ico i');
    const data = labels(mode, effective);
    if (text) text.textContent = data.text;
    if (ico) ico.className = `fas ${data.iconClass}`;
    btn.title = data.title;
    btn.setAttribute('aria-label', data.title);
  }

  function nextMode(currentMode) {
    if (currentMode === 'auto') return 'dark';
    if (currentMode === 'dark') return 'light';
    return 'auto';
  }

  function setupToggleButton() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn || btn.dataset.zcThemeBound === '1') return;
    btn.dataset.zcThemeBound = '1';
    btn.addEventListener('click', function () {
      const current = root.getAttribute('data-theme-mode') || 'auto';
      const next = nextMode(current);
      saveTheme(next);
      applyTheme(next);
      showThemeStatusTmp(statusText(next, getEffectiveTheme(next)));
    });
  }

  function onReady() {
    setupToggleButton();
    applyTheme(getSavedTheme());
    const langSel = document.getElementById('uiLangSelect');
    if (langSel) {
      langSel.addEventListener('change', function () {
        const mode = root.getAttribute('data-theme-mode') || 'auto';
        updateThemeButton(mode, getEffectiveTheme(mode));
      });
    }
  }

  if (prefersDarkMq) {
    const onSchemeChange = function () {
      if ((root.getAttribute('data-theme-mode') || 'auto') === 'auto') applyTheme('auto');
    };
    if (typeof prefersDarkMq.addEventListener === 'function') prefersDarkMq.addEventListener('change', onSchemeChange);
    else if (typeof prefersDarkMq.addListener === 'function') prefersDarkMq.addListener(onSchemeChange);
  }

  window.addEventListener('storage', function (e) {
    if (e && e.key === KEY) applyTheme(getSavedTheme());
    if (e && e.key === 'uiLang') updateThemeButton(root.getAttribute('data-theme-mode') || 'auto', getEffectiveTheme(root.getAttribute('data-theme-mode') || 'auto'));
  });

  document.addEventListener('DOMContentLoaded', onReady, { once: true });
})();
