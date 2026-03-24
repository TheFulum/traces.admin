import { auth } from '../../js/firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { db } from '../../js/firebase-init.js';
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
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

let allFeedback  = [];
let activeFilter = 0; // 0 = all

// ── load ──────────────────────────────────────────────────────────────────

try {
  const q    = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  allFeedback = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderStats();
  renderList();
} catch (err) {
  console.error(err);
  showToast('Ошибка загрузки отзывов', 'error');
}

// ── filter ────────────────────────────────────────────────────────────────

document.getElementById('filter-row').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  activeFilter = parseInt(btn.dataset.rating, 10);
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
});

// ── render stats ──────────────────────────────────────────────────────────

function renderStats() {
  const total = allFeedback.length;
  const avg   = total
    ? (allFeedback.reduce((s, f) => s + (f.rating || 0), 0) / total).toFixed(1)
    : '—';
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-avg').textContent   = total ? `${avg} ★` : '—';
}

// ── render list ───────────────────────────────────────────────────────────

function renderList() {
  const listEl   = document.getElementById('feedback-list');
  const emptyEl  = document.getElementById('empty-state');

  const filtered = activeFilter
    ? allFeedback.filter(f => f.rating === activeFilter)
    : allFeedback;

  if (!filtered.length) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  listEl.innerHTML = filtered.map(f => {
    const stars   = '★'.repeat(f.rating || 0) + '☆'.repeat(5 - (f.rating || 0));
    const dateStr = f.createdAt?.toDate
      ? f.createdAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';

    return `
      <div class="feedback-item">
        <div>
          <div class="feedback-item__email">${esc(f.email || '—')}</div>
          <div class="feedback-item__message">${esc(f.message || '')}</div>
        </div>
        <div class="feedback-item__meta">
          <div class="feedback-item__stars">${stars}</div>
          <div class="feedback-item__date">${dateStr}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
