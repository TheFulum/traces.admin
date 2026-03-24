import { db } from './firebase-init.js';
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { showToast, checkRateLimit, formatRemaining, markActiveNav } from './utils.js';

markActiveNav();

const RATE_LIMIT_MS = 60_000; // 1 submission per minute

// ── elements ──────────────────────────────────────────────────────────────

const emailEl    = document.getElementById('email');
const messageEl  = document.getElementById('message');
const submitBtn  = document.getElementById('submit-btn');
const statusEl   = document.getElementById('form-status');
const ratingText = document.getElementById('rating-text');
const formCard   = document.getElementById('form-card');

// ── star rating labels ────────────────────────────────────────────────────

const RATING_LABELS = {
  1: 'Очень плохо',
  2: 'Плохо',
  3: 'Нормально',
  4: 'Хорошо',
  5: 'Отлично'
};

document.querySelectorAll('input[name="rating"]').forEach(input => {
  input.addEventListener('change', () => {
    ratingText.textContent = RATING_LABELS[input.value] || '';
  });
});

// ── submit ────────────────────────────────────────────────────────────────

submitBtn.addEventListener('click', async () => {
  const email   = emailEl.value.trim();
  const message = messageEl.value.trim();
  const ratingEl = document.querySelector('input[name="rating"]:checked');
  const rating  = ratingEl ? parseInt(ratingEl.value, 10) : null;

  // validate
  if (!email || !isValidEmail(email)) {
    setStatus('Введите корректный адрес электронной почты.', 'error');
    emailEl.focus();
    return;
  }
  if (!message) {
    setStatus('Напишите сообщение.', 'error');
    messageEl.focus();
    return;
  }
  if (!rating) {
    setStatus('Пожалуйста, поставьте оценку.', 'error');
    return;
  }

  // rate limit
  const rl = checkRateLimit('feedback', RATE_LIMIT_MS);
  if (!rl.allowed) {
    setStatus(`Повторная отправка через ${formatRemaining(rl.remainingMs)}.`, 'error');
    return;
  }

  // submit
  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправка…';
  setStatus('');

  try {
    await addDoc(collection(db, 'feedback'), {
      email,
      message,
      rating,
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

// ── success state ─────────────────────────────────────────────────────────

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

// ── helpers ───────────────────────────────────────────────────────────────

function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `form-status${type ? ' ' + type : ''}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
