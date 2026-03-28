import { auth } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

export function initNav(root = '') {
  const navEl = document.querySelector('nav.nav');
  if (!navEl) return;

  const path = window.location.pathname;

  const links = [
    { href: `${root}index.html`,    label: 'Места' },
    { href: `${root}map.html`,      label: 'Карта' },
    { href: `${root}chat.html`,     label: 'Чат' },
    { href: `${root}feedback.html`, label: 'Отзыв' },
  ];

  function isActive(href) {
    const clean = href.replace(/^\.\.\//, '').replace(/^\.\//, '');
    return path.endsWith(clean);
  }

  function buildNav(user) {
    const authBtn = user
      ? `<a href="${root}admin/places.html" class="nav__login nav__admin">Админ</a>`
      : `<a href="${root}admin/login.html"  class="nav__login">Войти</a>`;

    const drawerAuthBtn = user
      ? `<a href="${root}admin/places.html" class="nav__drawer__login nav__drawer__admin">Админ</a>`
      : `<a href="${root}admin/login.html"  class="nav__drawer__login">Войти</a>`;

    navEl.innerHTML = `
      <div class="nav__inner">
        <a href="${root}index.html" class="nav__logo">Следы прошлого</a>

        <div class="nav__right">
          <ul class="nav__links">
            ${links.map(l => `
              <li><a href="${l.href}"${isActive(l.href) ? ' class="active"' : ''}>${l.label}</a></li>
            `).join('')}
          </ul>
          ${authBtn}
        </div>

        <button class="nav__burger" id="nav-burger" aria-label="Меню">
          <span></span><span></span><span></span>
        </button>
      </div>

      <div class="nav__drawer" id="nav-drawer">
        ${links.map(l => `
          <a href="${l.href}"${isActive(l.href) ? ' class="active"' : ''}>${l.label}</a>
        `).join('')}
        <div class="nav__drawer__divider"></div>
        ${drawerAuthBtn}
      </div>
    `;

    // burger
    const burger = document.getElementById('nav-burger');
    const drawer = document.getElementById('nav-drawer');

    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      drawer.classList.toggle('open');
    });

    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        burger.classList.remove('open');
        drawer.classList.remove('open');
      });
    });

    document.addEventListener('click', e => {
      if (!navEl.contains(e.target)) {
        burger.classList.remove('open');
        drawer.classList.remove('open');
      }
    });
  }

  // render immediately with no user, then update when auth resolves
  buildNav(null);
  onAuthStateChanged(auth, user => buildNav(user));
}