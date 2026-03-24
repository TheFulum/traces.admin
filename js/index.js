import { getPlaces } from './places.js';
import { showToast, showSkeletons, markActiveNav } from './utils.js';

markActiveNav();

const grid    = document.getElementById('grid');
const countEl = document.getElementById('count');
const search  = document.getElementById('search');
const errorEl = document.getElementById('error');

let allPlaces = [];

// ── boot ──────────────────────────────────────────────────────────────────

showSkeletons(grid, 6);

try {
  allPlaces = await getPlaces();
  render(allPlaces);
} catch (err) {
  console.error(err);
  grid.innerHTML = '';
  errorEl.classList.remove('hidden');
  showToast('Не удалось загрузить места', 'error');
}

// ── search ────────────────────────────────────────────────────────────────

search.addEventListener('input', () => {
  const q = search.value.trim().toLowerCase();
  const filtered = q
    ? allPlaces.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.location?.address || '').toLowerCase().includes(q)
      )
    : allPlaces;
  render(filtered);
});

// ── render ────────────────────────────────────────────────────────────────

function render(places) {
  countEl.textContent = places.length
    ? `${places.length} ${plural(places.length, 'место', 'места', 'мест')}`
    : '';

  if (!places.length) {
    grid.innerHTML = `
      <div class="state-empty" style="grid-column:1/-1">
        <h3>Ничего не найдено</h3>
        <p>Попробуйте изменить запрос.</p>
      </div>`;
    return;
  }

  grid.innerHTML = places.map(placeCard).join('');
}

function placeCard(p) {
  const img = p.photos?.[0]
    ? `<img class="card__img" src="${p.photos[0]}" alt="${esc(p.name)}" loading="lazy" />`
    : `<div class="card__img--placeholder">нет фото</div>`;

  const loc = p.location?.address
    ? `<span class="card__location">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        ${esc(p.location.address)}
      </span>`
    : '';

  return `
    <article class="card" onclick="location.href='place.html?id=${p.id}'">
      ${img}
      <div class="card__body">
        <h3 class="card__title">${esc(p.name)}</h3>
        ${loc}
        <span class="card__btn">
          Подробнее
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </span>
      </div>
    </article>`;
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plural(n, one, few, many) {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}
