import { auth } from '../../js/firebase-init.js';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const emailEl    = document.getElementById('email');
const passwordEl = document.getElementById('password');
const loginBtn   = document.getElementById('login-btn');
const statusEl   = document.getElementById('form-status');

// if already logged in — redirect immediately
onAuthStateChanged(auth, user => {
  if (user) window.location.href = 'places.html';
});

// enter key support
[emailEl, passwordEl].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
});

loginBtn.addEventListener('click', login);

async function login() {
  const email    = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email || !password) {
    setStatus('Заполните все поля.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Вход…';
  setStatus('');

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'places.html';
  } catch (err) {
    console.error(err);
    setStatus(friendlyError(err.code));
    loginBtn.disabled = false;
    loginBtn.textContent = 'Войти';
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':        return 'Неверный формат почты.';
    case 'auth/user-not-found':       return 'Пользователь не найден.';
    case 'auth/wrong-password':       return 'Неверный пароль.';
    case 'auth/invalid-credential':   return 'Неверная почта или пароль.';
    case 'auth/too-many-requests':    return 'Слишком много попыток. Попробуйте позже.';
    default:                          return 'Ошибка входа. Попробуйте ещё раз.';
  }
}
