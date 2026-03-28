import { initNav } from './nav.js';
import { db } from './firebase-init.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast, checkRateLimit, formatRemaining } from './utils.js';

initNav('');

// ── star rating ───────────────────────────────────────────────────────────

const LABELS = { 1: 'Очень плохо', 2: 'Плохо', 3: 'Нормально', 4: 'Хорошо', 5: 'Отлично' };

let selectedRating = 0;

const stars      = Array.from(document.querySelectorAll('.star'));
const ratingText = document.getElementById('rating-text');

function paint(upTo) {
  stars.forEach(s => s.classList.toggle('on', parseInt(s.dataset.v) <= upTo));
}

stars.forEach(star => {
  const v = parseInt(star.dataset.v);

  star.addEventListener('click', () => {
    selectedRating = v;
    paint(v);
    ratingText.textContent = LABELS[v];
  });

  star.addEventListener('mouseenter', () => paint(v));
  star.addEventListener('mouseleave', () => paint(selectedRating));
});

// ── submit ────────────────────────────────────────────────────────────────

const RATE_LIMIT_MS = 60_000;

const emailEl   = document.getElementById('email');
const messageEl = document.getElementById('message');
const submitBtn = document.getElementById('submit-btn');
const statusEl  = document.getElementById('form-status');
const formCard  = document.getElementById('form-card');

submitBtn.addEventListener('click', async () => {
  const email   = emailEl.value.trim();
  const message = messageEl.value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus('Введите корректный адрес электронной почты.', 'error');
    emailEl.focus();
    return;
  }
  if (!message) {
    setStatus('Напишите сообщение.', 'error');
    messageEl.focus();
    return;
  }
  if (!selectedRating) {
    setStatus('Пожалуйста, поставьте оценку.', 'error');
    return;
  }

  const rl = checkRateLimit('feedback', RATE_LIMIT_MS);
  if (!rl.allowed) {
    setStatus(`Повторная отправка через ${formatRemaining(rl.remainingMs)}.`, 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправка…';
  setStatus('');

  try {
    await addDoc(collection(db, 'feedback'), {
      email,
      message,
      rating: selectedRating,
      createdAt: serverTimestamp()
    });
    showSuccess();
  } catch (err) {
    console.error(err);
    setStatus('Ошибка отправки. Попробуйте ещё раз.', 'error');
    showToast('Ошибка отправки', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Отправить';
  }
});

// ── helpers ───────────────────────────────────────────────────────────────

function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `form-status${type ? ' ' + type : ''}`;
}

function showSuccess() {
  formCard.innerHTML = `
    <div class="feedback-success">
      <div class="feedback-success__icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2 class="feedback-success__title">Спасибо за отзыв!</h2>
      <p class="feedback-success__sub">Мы ценим ваше мнение и обязательно его учтём.</p>
      <a href="index.html" class="btn btn--outline">← Вернуться к местам</a>
    </div>
  `;
}