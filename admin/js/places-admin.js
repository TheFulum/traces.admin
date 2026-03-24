import { auth } from '../../js/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getPlaces, addPlace, updatePlace, deletePlace } from '../../js/places.js';
import { uploadImages } from '../../js/cloudinary.js';
import { showToast } from '../../js/utils.js';

// ── auth guard ────────────────────────────────────────────────────────────

onAuthStateChanged(auth, user => {
  if (!user) window.location.href = 'login.html';
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// ── state ─────────────────────────────────────────────────────────────────

let places     = [];
let editingId  = null;      // null = add mode, string = edit mode
let photoUrls  = [];        // final URLs (already uploaded or existing)
let newFiles   = [];        // File objects pending upload
let pickerMap  = null;      // Leaflet map in modal
let pickerMarker = null;

// ── load places ───────────────────────────────────────────────────────────

async function loadPlaces() {
  try {
    places = await getPlaces();
    renderTable();
  } catch (err) {
    console.error(err);
    showToast('Ошибка загрузки мест', 'error');
  }
}
loadPlaces();

// ── table ─────────────────────────────────────────────────────────────────

function renderTable() {
  const tbody    = document.getElementById('places-tbody');
  const emptyEl  = document.getElementById('empty-state');

  if (!places.length) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  tbody.innerHTML = places.map(p => `
    <tr>
      <td>
        ${p.photos?.[0]
          ? `<img class="table-thumb" src="${esc(p.photos[0])}" alt="" />`
          : `<div class="table-thumb--empty">нет</div>`}
      </td>
      <td>
        <div class="table-name">${esc(p.name)}</div>
        <div class="table-addr">${esc(p.location?.address || '—')}</div>
      </td>
      <td>${p.sketchfabModelId ? '✓' : '—'}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon" data-action="edit" data-id="${p.id}" title="Редактировать">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${p.id}" title="Удалить">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // delegate events
  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.action === 'edit')   openEdit(btn.dataset.id);
      if (btn.dataset.action === 'delete') confirmDelete(btn.dataset.id);
    });
  });
}

// ── delete ────────────────────────────────────────────────────────────────

async function confirmDelete(id) {
  const place = places.find(p => p.id === id);
  if (!place) return;
  if (!confirm(`Удалить «${place.name}»? Это действие нельзя отменить.`)) return;
  try {
    await deletePlace(id);
    showToast('Место удалено');
    await loadPlaces();
  } catch (err) {
    showToast('Ошибка удаления', 'error');
  }
}

// ── modal open/close ──────────────────────────────────────────────────────

document.getElementById('add-btn').addEventListener('click', () => openModal(null));

function openEdit(id) {
  const place = places.find(p => p.id === id);
  if (place) openModal(place);
}

function openModal(place) {
  editingId = place?.id || null;
  photoUrls = place?.photos ? [...place.photos] : [];
  newFiles  = [];

  document.getElementById('modal-title').textContent = place ? 'Редактировать место' : 'Добавить место';
  document.getElementById('f-name').value    = place?.name || '';
  document.getElementById('f-address').value = place?.location?.address || '';
  document.getElementById('f-lat').value     = place?.location?.lat || '';
  document.getElementById('f-lng').value     = place?.location?.lng || '';
  document.getElementById('f-desc').value    = place?.description || '';
  document.getElementById('f-model').value   = place?.sketchfabModelId || '';
  document.getElementById('photo-progress').textContent = '';

  renderPhotoPreviews();
  document.getElementById('modal').classList.remove('hidden');

  // init map after modal visible
  setTimeout(initPickerMap, 50);
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  if (pickerMap) { pickerMap.remove(); pickerMap = null; pickerMarker = null; }
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});

// ── coord picker map ──────────────────────────────────────────────────────

function initPickerMap() {
  if (pickerMap) return;
  const L   = window.L;
  const lat  = parseFloat(document.getElementById('f-lat').value) || 55.7558;
  const lng  = parseFloat(document.getElementById('f-lng').value) || 37.6173;

  pickerMap = L.map('coord-map', { zoomControl: true }).setView([lat, lng], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(pickerMap);

  // if editing and coords exist — place marker
  if (document.getElementById('f-lat').value) {
    pickerMarker = L.marker([lat, lng]).addTo(pickerMap);
  }

  pickerMap.on('click', e => {
    const { lat, lng } = e.latlng;
    document.getElementById('f-lat').value = lat.toFixed(6);
    document.getElementById('f-lng').value = lng.toFixed(6);
    document.getElementById('coord-hint').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (pickerMarker) pickerMap.removeLayer(pickerMarker);
    pickerMarker = L.marker([lat, lng]).addTo(pickerMap);
  });
}

// ── photo upload ──────────────────────────────────────────────────────────

const uploadArea = document.getElementById('upload-area');
const fileInput  = document.getElementById('file-input');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag');
  handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
  const remaining = 10 - photoUrls.length - newFiles.length;
  const toAdd     = Array.from(files).slice(0, remaining);
  if (!toAdd.length) {
    showToast('Максимум 10 фотографий', 'error');
    return;
  }
  newFiles.push(...toAdd);
  renderPhotoPreviews();
}

function renderPhotoPreviews() {
  const container = document.getElementById('photo-previews');

  const existingHtml = photoUrls.map((url, i) => `
    <div class="photo-preview">
      <img src="${esc(url)}" alt="Фото ${i + 1}" />
      <button class="photo-preview__del" data-type="existing" data-idx="${i}">×</button>
    </div>
  `).join('');

  const newHtml = newFiles.map((file, i) => {
    const objUrl = URL.createObjectURL(file);
    return `
      <div class="photo-preview">
        <img src="${objUrl}" alt="Новое фото ${i + 1}" />
        <button class="photo-preview__del" data-type="new" data-idx="${i}">×</button>
      </div>
    `;
  }).join('');

  container.innerHTML = existingHtml + newHtml;

  container.querySelectorAll('.photo-preview__del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.type === 'existing') {
        photoUrls.splice(parseInt(btn.dataset.idx, 10), 1);
      } else {
        newFiles.splice(parseInt(btn.dataset.idx, 10), 1);
      }
      renderPhotoPreviews();
    });
  });
}

// ── save ──────────────────────────────────────────────────────────────────

document.getElementById('modal-save').addEventListener('click', save);

async function save() {
  const name    = document.getElementById('f-name').value.trim();
  const address = document.getElementById('f-address').value.trim();
  const lat     = parseFloat(document.getElementById('f-lat').value);
  const lng     = parseFloat(document.getElementById('f-lng').value);
  const desc    = document.getElementById('f-desc').value.trim();
  const modelId = document.getElementById('f-model').value.trim();

  if (!name) { showToast('Введите название', 'error'); return; }

  const saveBtn = document.getElementById('modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Сохранение…';

  try {
    // upload new photos
    let uploadedUrls = [];
    if (newFiles.length) {
      const progressEl = document.getElementById('photo-progress');
      uploadedUrls = await uploadImages(newFiles, (fileIdx, filePct, overall) => {
        progressEl.textContent = `Загрузка фото… ${overall}%`;
      });
      document.getElementById('photo-progress').textContent = '';
    }

    const allPhotos = [...photoUrls, ...uploadedUrls];

    const data = {
      name,
      description: desc,
      location: {
        lat:     isNaN(lat) ? 0 : lat,
        lng:     isNaN(lng) ? 0 : lng,
        address: address
      },
      photos: allPhotos,
      sketchfabModelId: modelId || null
    };

    if (editingId) {
      await updatePlace(editingId, data);
      showToast('Место обновлено');
    } else {
      await addPlace(data);
      showToast('Место добавлено');
    }

    closeModal();
    await loadPlaces();

  } catch (err) {
    console.error(err);
    showToast('Ошибка сохранения: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Сохранить';
  }
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
