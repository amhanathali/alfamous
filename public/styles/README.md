# Architecture CSS — Alfamous

Document de référence pour la **maintenance** des styles. Toute contribution doit
respecter l'ordre de chargement, la scope des fichiers, et l'usage des tokens.

---

## Ordre de chargement

`public/index.html` charge **dans l'ordre** :

1. `public/styles.css` — fichier principal (règles transverses restantes + `@import` des modules).
2. `public/styles/99-overrides.css` — chargé **après** `styles.css` via un `<link>` dédié, pour garantir le « dernier mot » dans la cascade.

À l'intérieur de `public/styles.css`, les `@import` sont déclarés en tête dans cet ordre :

```
01-tokens.css
02-reset-base.css
03-comment-popup.css
04-popup-shell.css
05-bandeau.css
06-cards.css
07-ctx-tab.css
08-record-languette.css
09-forum.css
10-forum-popups.css
11-medias.css
12-login.css
13-selection-ctx-menu.css
14-modules-toolbar.css
15-bloc2-actions.css
16-newsletter.css
17-topline-stickyhead.css
18-popup-context-menu.css
19-popups-utils.css
```

L'ordre des numéros **est la cascade**. Les modules qui définissent des règles
partagées (tokens, shell popup) viennent en premier ; les spécialisations suivent.

---

## Responsabilité de chaque fichier

| Fichier | Rôle |
|---|---|
| `01-tokens.css` | Design tokens (palette, typo, icônes, espaces, rayons, popup, modules). **Unique source de vérité** pour les variables globales. |
| `02-reset-base.css` | `html`, `body`, `.light-background` (base typo + scroll). |
| `03-comment-popup.css` | Popup commentaires / notes / forum reply (overlay, box, champs, onglets, mode zen). |
| `04-popup-shell.css` | Gabarit commun des popups (`.popup-container`, `.popup-content`, `.popup-header`, `.popup-body`, `.popup-overlay`, `.popup-box`, `.popup-close`). |
| `05-bandeau.css` | Bandeau `#infosProgEnCours` + barres d'outils Zoom / Lexique (ME, MC, Trad, Historik, Copier tout). |
| `06-cards.css` | Cartes d'enregistrements (`.zc-result-card-head`, `.zc-record-languette > p`, `.zc-result-copy-sel`). |
| `07-ctx-tab.css` | Bouton menu contextuel ☰ (variantes a/button/comment/af-modal/medias/hamburger). |
| `08-record-languette.css` | Gabarit de carte (`.zc-record-languette`, variantes Aya/Lexique/Article/Target, body, hover). |
| `09-forum.css` | Shell Forum : root, layout, head, welcome, notify, messages, cartes posts, thread, reply-editor inline. |
| `10-forum-popups.css` | Popups Forum : reply / reader / edit / read (+ load-more, source-pill, subject-link-btn). |
| `11-medias.css` | Module Médias (`#medias1App` et variantes `.zc-medias-*`). |
| `12-login.css` | Modale connexion / inscription (`.zc-login-*`). |
| `13-selection-ctx-menu.css` | Menu contextuel de sélection `#selectionContextMenu` (`.zc-ctx-*`). |
| `14-modules-toolbar.css` | Squelette des panneaux modules (SAWM / SALAT / CHOKR / Recherche Soura / Versets / Footer) + `.toolbar1`, `.zc-module-*`, `.zc-top-action-*`. |
| `15-bloc2-actions.css` | Bloc 2 « Recherche versets » + media query mobile modules. |
| `16-newsletter.css` | Popup Newsletter. |
| `17-topline-stickyhead.css` | Barre du haut figée (`.zc-app-sticky-head`, `.topline`, `.zc-lang-picker`). |
| `18-popup-context-menu.css` | Menu hamburger `#popupContextMenu` + `.ctxmenu-*`. |
| `19-popups-utils.css` | Toasts (`.messagePopup`), overlay sombre, suggestions, `#inputSoura`, `#audioContainer`. |
| `99-overrides.css` | Règles « last-wins » (chargées via `<link>` après `styles.css`). |
| `styles.css` | Règles transverses restantes (boutons génériques, modals simples, translit, chip, helpPopup, popupHtml fullbleed, etc.). |

---

## Design tokens — échelles à utiliser

Toutes les nouvelles règles doivent consommer les tokens de `01-tokens.css`
plutôt que d'écrire des valeurs hardcodées. Échelles disponibles :

### Typographie
- `--zc-fs-xxs` 0.68rem · `--zc-fs-xs` 0.75rem · `--zc-fs-sm` 0.82rem · `--zc-fs-md` 0.9rem · `--zc-fs-base` 1rem · `--zc-fs-lg` 1.15rem · `--zc-fs-xl` 1.3rem.
- Interlignes : `--zc-lh-tight` 1.15 · `--zc-lh-normal` 1.4 · `--zc-lh-loose` 1.6.

### Icônes
- `--zc-icon-xs` 0.7rem · `--zc-icon-sm` 0.85rem · `--zc-icon-md` 1rem · `--zc-icon-lg` 1.2rem.

### Espaces (stack / gap / padding)
- `--zc-space-1` 2px · `--zc-space-2` 4px · `--zc-space-3` 6px · `--zc-space-4` 8px · `--zc-space-5` 12px · `--zc-space-6` 16px.

### Rayons
- `--zc-radius-xs` 5px · `--zc-radius-sm` 8px · `--zc-radius` 12px.

### Couleurs
- Palette : `--zc-bg`, `--zc-surface`, `--zc-border`, `--zc-text`, `--zc-text-muted`, `--zc-accent`, `--zc-link`, `--zc-danger`, `--zc-grey`.
- Popup résultats : `--zc-popup-bg`, `--zc-popup-bg-border`, `--zc-popup-link`, `--zc-popup-link-hover`, `--zc-popup-link-soft`, `--zc-popup-chip-bg`, `--zc-popup-chip-bg-hover`, `--zc-popup-title-color`.

---

## Règles pour un nouveau module

1. **Ne jamais** hardcoder une couleur, taille de police ou espace déjà couvert par un token.
2. Un composant spécifique (ex: nouveau module Articles) → nouveau fichier `public/styles/XX-nom-module.css` ; numéro = position dans la cascade.
3. Déclarer l'`@import` dans `styles.css`, dans l'ordre.
4. Ajouter l'entrée au tableau ci-dessus.
5. **Ne jamais** mettre de règle « last-wins » dans un module : utiliser `99-overrides.css`, avec un commentaire expliquant pourquoi.

---

## Helpers JS utilitaires

Voir `public/jsZC/zc-utils.js` (Phase B) pour les fonctions partagées :
`zc.escapeHtml`, `zc.escapeAttr`, `zc.escapeText`, `zc.escapeSimple`, `zc.shortenLabel`.
Alias legacy : `window.escapeHtml`, `window.zcEscapeHtmlAttr`, `window.zcEscapeHtmlText`, `window.escapeHtmlForum`, `window.shortenLabel`.
