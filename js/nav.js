/**
 * Injects the shared nav + mobile drawer into every page.
 * Call: initNav(root) where root is '' for top-level pages,
 * '../' for pages inside /admin/.
 *
 * Usage in each page:
 *   import { initNav } from './nav.js';
 *   initNav('');
 */
export function initNav(root = '') {
  // ── inject HTML ──────────────────────────────────────────────────────────
  const navEl = document.querySelector('nav.nav');
  if (!navEl) return;

  const path = window.location.pathname;

  const links = [
    { href: `${root}index.html`,    label: 'Места' },
    { href: `${root}map.html`,      label: 'Карта' },
    { href: `${root}chat.html`,     label: 'Чат' },
    { href: `${root}feedback.html`, label: 'Отзыв' },
  ];

  function linkHtml(cls) {
    return links.map(l => {
      const active = path.endsWith(l.href.replace(/^\.\.\//, '').replace(/^\.\//, '')) ? ' active' : '';
      return `<a href="${l.href}" class="${cls}${active}">${l.label}</a>`;
    }).join('');
  }

  navEl.innerHTML = `
    <div class="nav__inner">
      <a href="${root}index.html" class="nav__logo">Следы прошлого</a>

      <!-- desktop -->
      <div class="nav__right">
        <ul class="nav__links">
          ${links.map(l => {
            const active = path.endsWith(l.href.replace(/^\.\.\//, '')) ? ' class="active"' : '';
            return `<li><a href="${l.href}"${active}>${l.label}</a></li>`;
          }).join('')}
        </ul>
        <a href="${root}admin/login.html" class="nav__login">Войти</a>
      </div>

      <!-- mobile burger -->
      <button class="nav__burger" id="nav-burger" aria-label="Меню">
        <span></span><span></span><span></span>
      </button>
    </div>

    <!-- mobile drawer -->
    <div class="nav__drawer" id="nav-drawer">
      ${linkHtml('') }
      <div class="nav__drawer__divider"></div>
      <a href="${root}admin/login.html" class="nav__drawer__login">Войти</a>
    </div>
  `;

  // ── burger toggle ────────────────────────────────────────────────────────
  const burger = document.getElementById('nav-burger');
  const drawer = document.getElementById('nav-drawer');

  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    drawer.classList.toggle('open');
  });

  // close drawer on link click
  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      drawer.classList.remove('open');
    });
  });

  // close on outside click
  document.addEventListener('click', e => {
    if (!navEl.contains(e.target)) {
      burger.classList.remove('open');
      drawer.classList.remove('open');
    }
  });
}
