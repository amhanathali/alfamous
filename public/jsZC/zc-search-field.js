/*
 * zc-search-field.js — Upgrade automatique des champs de recherche (Phase D).
 *
 * Rôle : transformer n'importe quel <input>/<textarea> marqué avec la classe
 * `.zc-search-auto` en champ de recherche standardisé avec :
 *   - un wrapper `.zc-search-wrap` (position relative, gestion z-index suggestions),
 *   - un bouton ✕ (`.zc-search-clear`) INSIDE à gauche — auto-hide si vide,
 *   - un bouton 📋 (`.zc-search-copy`) INSIDE à droite — auto-hide si vide (opt-out via `data-no-copy`),
 *   - binding automatique de `confirmClearField` sur ✕ (opt-in via `data-confirm-clear="1"`),
 *   - binding automatique du toggle `.is-hidden` via `bindSearchClearVisibility`.
 *
 * Usage :
 *   <textarea class="zc-ui-search-field zc-search-auto"
 *             data-confirm-clear="1"
 *             data-clear-message="Vider le champ ?"></textarea>
 *
 * Option `data-no-copy="1"` pour ne pas ajouter le bouton copier.
 *
 * Idempotent : l'upgrade ne s'applique qu'une seule fois par champ (marque sur l'élément).
 */
(function () {
  'use strict';

  function makeBtn(id, cls, title, innerHtml) {
    const b = document.createElement('button');
    b.type = 'button';
    if (id) b.id = id;
    b.className = cls + ' is-hidden';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.innerHTML = innerHtml;
    return b;
  }

  function copyToClipboardValue(el) {
    const v = String(el && el.value || '');
    if (!v) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(v).catch(function () { });
      } else {
        el.select();
        document.execCommand('copy');
      }
    } catch (_) { }
  }

  /**
   * Upgrade un champ <input>/<textarea> en recherche standardisée.
   * @param {HTMLElement} el  Champ à upgrader.
   * @param {object} [opts]   { noCopy?, confirmClear?, clearMessage? }
   */
  function zcUpgradeSearchField(el, opts) {
    if (!el) return;
    if (el.__zcSearchUpgraded) return;
    if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;

    opts = opts || {};
    const noCopy = opts.noCopy != null ? !!opts.noCopy : el.hasAttribute('data-no-copy');
    const confirmClear = opts.confirmClear != null ? !!opts.confirmClear : el.getAttribute('data-confirm-clear') === '1';
    const clearMsg = opts.clearMessage || el.getAttribute('data-clear-message') || 'Vider ce champ ? Le contenu saisi sera perdu.';

    // Si le champ est déjà dans un .zc-search-wrap, ne pas re-envelopper.
    let wrap = el.parentElement;
    if (!wrap || !wrap.classList.contains('zc-search-wrap')) {
      wrap = document.createElement('div');
      wrap.className = 'zc-search-wrap';
      if (el.tagName === 'TEXTAREA') wrap.classList.add('zc-search-wrap--textarea');
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
    }

    // S'assurer que le champ a `.zc-ui-search-field` pour hériter du style commun.
    if (!el.classList.contains('zc-ui-search-field')) el.classList.add('zc-ui-search-field');

    // ✕ à gauche
    const fieldId = el.id || '';
    let clearBtn = wrap.querySelector(':scope > .zc-search-clear');
    if (!clearBtn) {
      clearBtn = makeBtn(
        fieldId ? fieldId + '-auto-clear' : null,
        'zc-search-clear',
        'Effacer',
        '✕'
      );
      wrap.insertBefore(clearBtn, el);
    }
    clearBtn.addEventListener('click', async function () {
      if (confirmClear && typeof window.confirmClearField === 'function') {
        await window.confirmClearField(el, clearMsg);
      } else {
        el.value = '';
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) { }
        try { el.focus(); } catch (_) { }
      }
    });

    // 📋 copier à droite (optionnel)
    if (!noCopy) {
      let copyBtn = wrap.querySelector(':scope > .zc-search-copy');
      if (!copyBtn) {
        copyBtn = makeBtn(
          fieldId ? fieldId + '-auto-copy' : null,
          'zc-search-copy',
          'Copier',
          '<i class="fas fa-copy" aria-hidden="true"></i>'
        );
        wrap.appendChild(copyBtn);
      }
      copyBtn.addEventListener('click', function () {
        copyToClipboardValue(el);
      });
      // Auto-hide si vide
      if (typeof window.bindSearchClearVisibility === 'function') {
        window.bindSearchClearVisibility(el, copyBtn);
      }
    }

    // Auto-hide du ✕ si vide
    if (typeof window.bindSearchClearVisibility === 'function') {
      window.bindSearchClearVisibility(el, clearBtn);
    }

    el.__zcSearchUpgraded = true;
  }

  function runAutoUpgrade() {
    document.querySelectorAll('.zc-search-auto').forEach(function (el) {
      try { zcUpgradeSearchField(el); } catch (err) { console.warn('[zc-search-field] upgrade', err); }
    });
  }

  // Expose
  (window.zc = window.zc || {}).upgradeSearchField = zcUpgradeSearchField;
  if (typeof window.zcUpgradeSearchField !== 'function') {
    window.zcUpgradeSearchField = zcUpgradeSearchField;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAutoUpgrade, { once: true });
  } else {
    runAutoUpgrade();
  }
  // Observer pendant 15 s pour attraper les champs rendus dynamiquement.
  try {
    const obs = new MutationObserver(runAutoUpgrade);
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { try { obs.disconnect(); } catch (_) { } }, 15000);
  } catch (_) { }
})();
