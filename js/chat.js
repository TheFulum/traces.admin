import { initNav } from './nav.js';
import { showToast, checkRateLimit, formatRemaining, markActiveNav } from './utils.js';
initNav('');

markActiveNav();

// ── config ────────────────────────────────────────────────────────────────

const API_KEY  = "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";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODELS   = [
  "openrouter/free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "deepseek/deepseek-r1:free"
];
const SYSTEM_PROMPT =
  "You are a cultural and historical guide for the 'Traces of the Past' app. " +
  "Answer ONLY questions related to history, architecture, culture, archaeology, " +
  "memorials, historical figures, and heritage sites. " +
  "If the question is unrelated to these topics, politely decline and redirect " +
  "the user to historical subjects. " +
  "Always respond in Russian, without English insertions. " +
  "Keep answers informative but concise — 2 to 4 paragraphs unless more detail is requested. " +
  "Do not mention that you are an AI model or reveal the model name.";

const RATE_LIMIT_MS = 30_000; // 30 seconds between requests

// ── state ─────────────────────────────────────────────────────────────────

/** @type {Array<{role:'user'|'assistant', content:string}>} */
const history = [];
let   isWaiting = false;

// ── elements ──────────────────────────────────────────────────────────────

const messagesEl  = document.getElementById('messages');
const welcomeEl   = document.getElementById('welcome');
const inputEl     = document.getElementById('chat-input');
const sendBtn     = document.getElementById('send-btn');
const statusEl    = document.getElementById('chat-status');

// ── hint buttons ──────────────────────────────────────────────────────────

document.querySelectorAll('.chat-hint').forEach(btn => {
  btn.addEventListener('click', () => {
    inputEl.value = btn.textContent;
    autoResize();
    updateSendBtn();
    inputEl.focus();
  });
});

// ── input handling ────────────────────────────────────────────────────────

inputEl.addEventListener('input', () => {
  autoResize();
  updateSendBtn();
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) submit();
  }
});

sendBtn.addEventListener('click', submit);

function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
}

function updateSendBtn() {
  sendBtn.disabled = isWaiting || inputEl.value.trim().length === 0;
}

// ── submit ────────────────────────────────────────────────────────────────

async function submit() {
  const text = inputEl.value.trim();
  if (!text || isWaiting) return;

  // rate limit check
  const rl = checkRateLimit('chat', RATE_LIMIT_MS);
  if (!rl.allowed) {
    setStatus(`Подождите ещё ${formatRemaining(rl.remainingMs)}`, 'error');
    return;
  }

  // hide welcome screen
  welcomeEl.remove();

  // add user message
  appendMessage('user', text);
  history.push({ role: 'user', content: text });

  // reset input
  inputEl.value = '';
  inputEl.style.height = 'auto';
  isWaiting = true;
  updateSendBtn();
  setStatus('');

  // add loading bubble
  const loadingId = 'loading-' + Date.now();
  appendLoading(loadingId);

  try {
    const reply = await sendWithFallback(history);
    removeLoading(loadingId);
    appendMessage('assistant', reply);
    history.push({ role: 'assistant', content: reply });
    setStatus('');
  } catch (err) {
    removeLoading(loadingId);
    setStatus(err.message, 'error');
    showToast(err.message, 'error');
    // remove the last user message from history so user can retry
    history.pop();
  } finally {
    isWaiting = false;
    updateSendBtn();
  }
}

// ── OpenRouter with fallback ──────────────────────────────────────────────

async function sendWithFallback(messages) {
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    console.log(`[chat] trying model [${i}]: ${model}`);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Traces of the Past'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      const data = await res.json();

      // retry on rate-limit, not-found or server error
      if (res.status === 429 || res.status === 404 || res.status >= 500) {
        console.warn(`[chat] model ${model} → ${res.status}, trying next…`);
        continue;
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error('API ключ недействителен. Обновите ключ OpenRouter в js/chat.js');
      }

      if (!res.ok) {
        throw new Error(`Ошибка API: ${res.status}`);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Пустой ответ от модели');

      return content.trim();

    } catch (err) {
      // network errors — no internet, stop immediately
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Ошибка сети. Проверьте подключение.');
      }
      // other errors on last model — rethrow
      if (i === MODELS.length - 1) throw err;
      console.warn(`[chat] model ${model} error:`, err.message);
    }
  }
  throw new Error('Все модели временно недоступны. Попробуйте позже.');
}

// ── render helpers ────────────────────────────────────────────────────────

function appendMessage(role, text) {
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `msg ${isUser ? 'msg--user' : ''}`;
  div.innerHTML = `
    <div class="msg__avatar">${isUser ? 'Вы' : 'Г'}</div>
    <div class="msg__bubble">${formatText(text)}</div>
  `;
  messagesEl.appendChild(div);
  scrollBottom();
}

function appendLoading(id) {
  const div = document.createElement('div');
  div.className = 'msg';
  div.id = id;
  div.innerHTML = `
    <div class="msg__avatar">Г</div>
    <div class="msg__bubble msg__bubble--loading">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  `;
  messagesEl.appendChild(div);
  scrollBottom();
}

function removeLoading(id) {
  document.getElementById(id)?.remove();
}

function scrollBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `chat-status${type ? ' ' + type : ''}`;
}

// Convert plain text to HTML — preserve paragraphs, bold **text**
function formatText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}