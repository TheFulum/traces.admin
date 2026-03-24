import { getPlace } from './places.js';
import { showToast, getParam, markActiveNav } from './utils.js';

markActiveNav();

const skeletonEl  = document.getElementById('skeleton');
const contentEl   = document.getElementById('content');
const errorEl     = document.getElementById('error');

const galleryEl   = document.getElementById('gallery');
const titleEl     = document.getElementById('title');
const addressEl   = document.getElementById('address');
const locBlockEl  = document.getElementById('location-block');
const mapBtnEl    = document.getElementById('map-btn');
const descEl      = document.getElementById('description');
const modelSec    = document.getElementById('model-section');
const modelIframe = document.getElementById('model-iframe');

// ── boot ──────────────────────────────────────────────────────────────────

const id = getParam('id');

if (!id) {
  showError();
} else {
  try {
    const place = await getPlace(id);
    if (!place) { showError(); }
    else { render(place); }
  } catch (err) {
    console.error(err);
    showError();
    showToast('Ошибка загрузки', 'error');
  }
}

// ── render ────────────────────────────────────────────────────────────────

function render(place) {
  document.title = `${place.name} — Следы прошлого`;

  // title
  titleEl.textContent = place.name;

  // location
  if (place.location?.address) {
    addressEl.textContent = place.location.address;
    mapBtnEl.addEventListener('click', () => {
      const params = new URLSearchParams({
        lat: place.location.lat,
        lng: place.location.lng,
        id
      });
      window.location.href = `map.html?${params}`;
    });
  } else {
    locBlockEl.style.display = 'none';
  }

  // gallery
  renderGallery(place.photos || []);

  // description — preserve line breaks as paragraphs
  if (place.description) {
    descEl.innerHTML = place.description
      .split(/\n{2,}/)
      .map(para => `<p>${esc(para.trim()).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  // 3D model
  if (place.sketchfabModelId) {
    // Sketchfab embed URL format
    const embedUrl = `https://sketchfab.com/models/${place.sketchfabModelId}/embed?autostart=0&ui_theme=dark&dnt=1`;
    modelIframe.src = embedUrl;
    modelSec.classList.remove('hidden');
  }

  skeletonEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
}

// ── gallery ───────────────────────────────────────────────────────────────

function renderGallery(photos) {
  if (!photos.length) {
    galleryEl.innerHTML = `<div class="gallery__main--placeholder">Нет фотографий</div>`;
    return;
  }

  const mainId = 'gallery-main';

  galleryEl.innerHTML = `
    <img id="${mainId}" class="gallery__main" src="${esc(photos[0])}" alt="Фото места" />
    ${photos.length > 1 ? `<div class="gallery__thumbs">${photos.map((url, i) => `
      <img
        class="gallery__thumb ${i === 0 ? 'active' : ''}"
        src="${esc(url)}"
        alt="Фото ${i + 1}"
        data-idx="${i}"
        loading="lazy"
      />`).join('')}
    </div>` : ''}
  `;

  if (photos.length > 1) {
    const mainImg = document.getElementById(mainId);
    galleryEl.querySelectorAll('.gallery__thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const idx = parseInt(thumb.dataset.idx, 10);
        mainImg.src = photos[idx];
        galleryEl.querySelectorAll('.gallery__thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }
}

// ── helpers ───────────────────────────────────────────────────────────────

function showError() {
  skeletonEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
