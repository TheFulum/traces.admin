import { getPlaces } from './places.js';
import { showToast, getParam } from './utils.js';

// ── map init ──────────────────────────────────────────────────────────────

const L = window.L;

const map = L.map('map', {
  center: [55.751244, 37.618423], // Moscow default
  zoom: 5,
  zoomControl: true,
  attributionControl: true
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19
}).addTo(map);

// ── custom marker icon ────────────────────────────────────────────────────

function makeIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="marker-pin"></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -32]
  });
}

// ── load places ───────────────────────────────────────────────────────────

const loadingEl = document.getElementById('map-loading');
let allPlaces   = [];
let markers     = [];

try {
  allPlaces = await getPlaces();
  allPlaces.forEach(addMarker);

  // if came from place.html with ?lat=&lng=&id=
  const lat = parseFloat(getParam('lat'));
  const lng = parseFloat(getParam('lng'));
  const id  = getParam('id');

  if (!isNaN(lat) && !isNaN(lng)) {
    map.setView([lat, lng], 14);
    const target = markers.find(m => m.placeId === id);
    if (target) target.marker.openPopup();
  } else if (allPlaces.length) {
    // fit map to all markers
    const group = L.featureGroup(markers.map(m => m.marker));
    map.fitBounds(group.getBounds().pad(0.15));
  }

} catch (err) {
  console.error(err);
  showToast('Не удалось загрузить места', 'error');
} finally {
  loadingEl.classList.add('hidden');
}

// ── add marker ────────────────────────────────────────────────────────────

function addMarker(place) {
  if (!place.location?.lat || !place.location?.lng) return;

  const marker = L.marker([place.location.lat, place.location.lng], {
    icon: makeIcon(),
    title: place.name
  }).addTo(map);

  marker.bindPopup(buildPopup(place), {
    maxWidth: 300,
    className: 'traces-popup'
  });

  markers.push({ marker, placeId: place.id });
}

// ── popup content ─────────────────────────────────────────────────────────

function buildPopup(place) {
  const img = place.photos?.[0]
    ? `<img class="map-popup__img" src="${esc(place.photos[0])}" alt="${esc(place.name)}" />`
    : `<div class="map-popup__img--placeholder">нет фото</div>`;

  const addr = place.location?.address
    ? `<p class="map-popup__addr">${esc(place.location.address)}</p>`
    : '';

  return `
    <div class="map-popup">
      ${img}
      <div class="map-popup__body">
        <h3 class="map-popup__title">${esc(place.name)}</h3>
        ${addr}
        <a href="place.html?id=${place.id}" class="map-popup__btn">
          Открыть
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
      </div>
    </div>`;
}

// ── "all places" list button ──────────────────────────────────────────────

document.getElementById('list-btn').addEventListener('click', () => {
  if (!markers.length) return;
  const group = L.featureGroup(markers.map(m => m.marker));
  map.fitBounds(group.getBounds().pad(0.15));
  map.closePopup();
});

// ── Nominatim search ──────────────────────────────────────────────────────

const searchInput   = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchClear   = document.getElementById('search-clear');

let searchTimer = null;
let searchMarker = null; // temporary marker for geocoded result

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  searchClear.classList.toggle('visible', q.length > 0);

  clearTimeout(searchTimer);
  if (q.length < 3) { closeResults(); return; }

  searchTimer = setTimeout(() => nominatimSearch(q), 500);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  closeResults();
  if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }
});

// close results when clicking outside
document.addEventListener('click', (e) => {
  if (!document.getElementById('map-search').contains(e.target)) closeResults();
});

async function nominatimSearch(query) {
  searchResults.innerHTML = `<p class="map-search__msg">Поиск…</p>`;
  searchResults.classList.add('open');

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=ru`;
    const res  = await fetch(url, {
      headers: { 'Accept-Language': 'ru', 'User-Agent': 'TracesOfThePast/1.0' }
    });
    const data = await res.json();

    if (!data.length) {
      searchResults.innerHTML = `<p class="map-search__msg">Ничего не найдено</p>`;
      return;
    }

    searchResults.innerHTML = data.map(item => `
      <div class="map-search__result" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${esc(item.display_name)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <div>
          <div class="map-search__result-name">${esc(shortName(item.display_name))}</div>
          <div class="map-search__result-addr">${esc(item.display_name)}</div>
        </div>
      </div>
    `).join('');

    searchResults.querySelectorAll('.map-search__result').forEach(el => {
      el.addEventListener('click', () => {
        const lat  = parseFloat(el.dataset.lat);
        const lon  = parseFloat(el.dataset.lon);
        const name = el.dataset.name;

        map.setView([lat, lon], 14);

        if (searchMarker) map.removeLayer(searchMarker);
        searchMarker = L.marker([lat, lon], { icon: makeIcon(), title: name }).addTo(map);

        searchInput.value = shortName(name);
        closeResults();
      });
    });

  } catch (err) {
    searchResults.innerHTML = `<p class="map-search__msg">Ошибка поиска</p>`;
  }
}

function closeResults() {
  searchResults.classList.remove('open');
  searchResults.innerHTML = '';
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Take first meaningful part of Nominatim display_name */
function shortName(displayName) {
  return displayName.split(',')[0].trim();
}
