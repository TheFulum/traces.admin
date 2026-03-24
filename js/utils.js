// ── Toast notifications ────────────────────────────────────────────────────

let _toastTimer = null;

/**
 * Show a toast message.
 * @param {string} message
 * @param {'default'|'error'} [type]
 * @param {number} [duration] ms
 */
export function showToast(message, type = 'default', duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.toggle('error', type === 'error');
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Rate limiter ───────────────────────────────────────────────────────────

/**
 * Simple localStorage-backed rate limiter.
 * @param {string} key     - unique key for this action
 * @param {number} limitMs - minimum ms between allowed calls
 * @returns {{ allowed: boolean, remainingMs: number }}
 */
export function checkRateLimit(key, limitMs) {
  const last = parseInt(localStorage.getItem(`rl_${key}`) || '0', 10);
  const now = Date.now();
  const elapsed = now - last;
  if (elapsed < limitMs) {
    return { allowed: false, remainingMs: limitMs - elapsed };
  }
  localStorage.setItem(`rl_${key}`, String(now));
  return { allowed: true, remainingMs: 0 };
}

/** Format remaining seconds for UI display. */
export function formatRemaining(ms) {
  const s = Math.ceil(ms / 1000);
  return s === 1 ? '1 second' : `${s} seconds`;
}

// ── DOM helpers ────────────────────────────────────────────────────────────

/** Get element by id, throw if not found. */
export function $ (id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

/** Query selector shorthand. */
export function $$ (selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

// ── URL params ─────────────────────────────────────────────────────────────

/** Get a query param value from the current URL. */
export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ── Navigation ─────────────────────────────────────────────────────────────

/** Mark the current page's nav link as active. */
export function markActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav__links a').forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('active', href && path.endsWith(href));
  });
}

// ── Skeleton helpers ───────────────────────────────────────────────────────

/** Replace element content with N skeleton cards. */
export function showSkeletons(container, count = 6) {
  container.innerHTML = Array.from({ length: count }, () => `
    <div class="card">
      <div class="skeleton" style="width:100%;aspect-ratio:4/3"></div>
      <div class="card__body">
        <div class="skeleton mt-8" style="height:20px;width:70%;border-radius:4px"></div>
        <div class="skeleton mt-8" style="height:14px;width:45%;border-radius:4px"></div>
        <div class="skeleton mt-16" style="height:32px;width:100px;border-radius:4px"></div>
      </div>
    </div>
  `).join('');
}
