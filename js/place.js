import { initNav } from './nav.js';
import { getPlace } from './places.js';
import { showToast, getParam } from './utils.js';

initNav('');

const skeletonEl = document.getElementById('skeleton');
const contentEl  = document.getElementById('content');
const errorEl    = document.getElementById('error');

// ── load ──────────────────────────────────────────────────────────────────

const id = getParam('id');
if (!id) { showError(); } else {
  try {
    const place = await getPlace(id);
    if (!place) showError();
    else render(place);
  } catch (err) {
    console.error(err);
    showError();
    showToast('Ошибка загрузки', 'error');
  }
}

// ── render ────────────────────────────────────────────────────────────────

function render(place) {
  document.title = `${place.name} — Следы прошлого`;

  document.getElementById('meta-title').textContent = place.name;

  // location
  if (place.location?.address) {
    document.getElementById('meta-address').textContent = place.location.address;
    document.getElementById('meta-location').classList.remove('hidden');
  }

  // opening address
  if (place.openingAddress) {
    document.getElementById('meta-opening-address').textContent = place.openingAddress;
    document.getElementById('meta-opening-address-row').classList.remove('hidden');
  }

  // date
  if (place.openingDate) {
    document.getElementById('meta-date').textContent = place.openingDate;
    document.getElementById('meta-date-row').classList.remove('hidden');
  }

  // author
  if (place.author) {
    document.getElementById('meta-author').textContent = place.author;
    document.getElementById('meta-author-row').classList.remove('hidden');
  }

  // tags
  if (place.tags?.length) {
    const tagsEl = document.getElementById('meta-tags');
    tagsEl.innerHTML = place.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('');
    tagsEl.classList.remove('hidden');
  }

  // gallery
  renderGallery(place.photos || []);

  // description
  const descEl = document.getElementById('description');
  if (place.description) {
    descEl.innerHTML = place.description
      .split(/\n{2,}/)
      .map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  // 3D model
  if (place.modelUrl) {
    renderModelViewer(place.modelUrl);
  }

  // route button
  document.getElementById('btn-route').addEventListener('click', () => {
    openRoute(place);
  });

  // share button
  document.getElementById('btn-share').addEventListener('click', () => {
    sharePlace(place);
  });

  skeletonEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
}

// ── gallery + lightbox ────────────────────────────────────────────────────

let photos = [];
let lbIndex = 0;

function renderGallery(arr) {
  photos = arr;
  const galleryEl = document.getElementById('gallery');

  if (!photos.length) {
    galleryEl.innerHTML = `<div class="gallery__main--placeholder">Нет фотографий</div>`;
    return;
  }

  galleryEl.innerHTML = `
    <div class="gallery__main-wrap" id="main-wrap">
      <img id="gallery-main" class="gallery__main" src="${esc(photos[0])}" alt="Фото места" />
      <span class="gallery__zoom-hint">нажмите для увеличения</span>
    </div>
    ${photos.length > 1 ? `<div class="gallery__thumbs">
      ${photos.map((url, i) => `
        <img class="gallery__thumb${i === 0 ? ' active' : ''}"
          src="${esc(url)}" alt="Фото ${i+1}"
          data-idx="${i}" loading="lazy" />
      `).join('')}
    </div>` : ''}
  `;

  const mainImg  = document.getElementById('gallery-main');
  const mainWrap = document.getElementById('main-wrap');

  // thumb click → change main
  galleryEl.querySelectorAll('.gallery__thumb').forEach(th => {
    th.addEventListener('click', () => {
      const idx = parseInt(th.dataset.idx);
      mainImg.src = photos[idx];
      galleryEl.querySelectorAll('.gallery__thumb').forEach(t => t.classList.remove('active'));
      th.classList.add('active');
      lbIndex = idx;
    });
  });

  // open lightbox
  mainWrap.addEventListener('click', () => openLightbox(lbIndex));
}

// lightbox
const lightbox  = document.getElementById('lightbox');
const lbImg     = document.getElementById('lb-img');
const lbCounter = document.getElementById('lb-counter');
const lbPrev    = document.getElementById('lb-prev');
const lbNext    = document.getElementById('lb-next');

function openLightbox(idx) {
  lbIndex = idx;
  lbImg.src = photos[idx];
  lbCounter.textContent = photos.length > 1 ? `${idx + 1} / ${photos.length}` : '';
  lbPrev.classList.toggle('hidden', photos.length <= 1);
  lbNext.classList.toggle('hidden', photos.length <= 1);
  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.add('hidden');
  document.body.style.overflow = '';
}

function lbGo(dir) {
  lbIndex = (lbIndex + dir + photos.length) % photos.length;
  lbImg.src = photos[lbIndex];
  lbCounter.textContent = `${lbIndex + 1} / ${photos.length}`;
}

document.getElementById('lb-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
lbPrev.addEventListener('click', e => { e.stopPropagation(); lbGo(-1); });
lbNext.addEventListener('click', e => { e.stopPropagation(); lbGo(1); });
document.addEventListener('keydown', e => {
  if (lightbox.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft')  lbGo(-1);
  if (e.key === 'ArrowRight') lbGo(1);
});

// ── model-viewer ──────────────────────────────────────────────────────────

function renderModelViewer(url) {
  if (!customElements.get('model-viewer')) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src  = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
    document.head.appendChild(s);
  }
  document.getElementById('model-wrapper').innerHTML = `
    <model-viewer src="${esc(url)}" alt="3D модель"
      camera-controls auto-rotate shadow-intensity="1"
      style="width:100%;height:100%;background:#0d0d0d">
    </model-viewer>`;
  document.getElementById('model-section').classList.remove('hidden');
}

// ── route ─────────────────────────────────────────────────────────────────

function openRoute(place) {
  const lat = place.location?.lat;
  const lng = place.location?.lng;
  if (!lat || !lng) { showToast('Координаты места не указаны', 'error'); return; }

  // Use navigator.share or geo: URI — on mobile opens native map picker
  const geoUri   = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(place.name)})`;
  const gmaps    = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const yandex   = `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`;
  const osm      = `https://www.openstreetmap.org/directions?to=${lat},${lng}`;

  // On mobile try geo: URI first (opens native picker on Android/iOS)
  if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
    window.location.href = geoUri;
    return;
  }

  // Desktop — show small picker
  showRoutePicker({ gmaps, yandex, osm });
}

function showRoutePicker({ gmaps, yandex, osm }) {
  const existing = document.getElementById('route-picker');
  if (existing) existing.remove();

  const picker = document.createElement('div');
  picker.id = 'route-picker';
  picker.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:var(--c-surface);border:1px solid var(--c-border);
    border-radius:var(--radius-md);box-shadow:var(--shadow-md);
    padding:16px;display:flex;flex-direction:column;gap:8px;
    z-index:300;min-width:220px;
  `;
  picker.innerHTML = `
    <p style="font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:var(--c-text-muted);margin-bottom:4px">Открыть в</p>
    <a href="${gmaps}" target="_blank" rel="noopener" style="padding:9px 14px;border:1px solid var(--c-border);border-radius:var(--radius-sm);font-size:.875rem;display:block;transition:background .15s" onmouseover="this.style.background='var(--c-accent-soft)'" onmouseout="this.style.background=''">Google Maps</a>
    <a href="${yandex}" target="_blank" rel="noopener" style="padding:9px 14px;border:1px solid var(--c-border);border-radius:var(--radius-sm);font-size:.875rem;display:block;transition:background .15s" onmouseover="this.style.background='var(--c-accent-soft)'" onmouseout="this.style.background=''">Яндекс Карты</a>
    <a href="${osm}" target="_blank" rel="noopener" style="padding:9px 14px;border:1px solid var(--c-border);border-radius:var(--radius-sm);font-size:.875rem;display:block;transition:background .15s" onmouseover="this.style.background='var(--c-accent-soft)'" onmouseout="this.style.background=''">OpenStreetMap</a>
  `;
  document.body.appendChild(picker);
  setTimeout(() => document.addEventListener('click', () => picker.remove(), { once: true }), 50);
}

// ── share ─────────────────────────────────────────────────────────────────

async function sharePlace(place) {
  const url   = window.location.href;
  const title = place.name;
  const text  = [
    place.name,
    place.openingDate   ? `Дата открытия: ${place.openingDate}`   : '',
    place.author        ? `Автор: ${place.author}`                 : '',
    place.location?.address ? place.location.address               : '',
    place.description   ? place.description.slice(0, 200) + (place.description.length > 200 ? '…' : '') : '',
    url
  ].filter(Boolean).join('\n');

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  // fallback — copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    showToast('Скопировано в буфер обмена');
  } catch {
    showToast('Не удалось скопировать', 'error');
  }
}

// ── helpers ───────────────────────────────────────────────────────────────

function showError() {
  skeletonEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}