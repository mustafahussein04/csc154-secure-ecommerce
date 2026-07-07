async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

function showMessage(el, text, isError = false) {
  el.textContent = text;
  el.className = 'msg ' + (isError ? 'error' : 'success');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function initStatusStrip() {
  const strip = document.getElementById('status-strip');
  if (!strip) return;

  const isSecure = window.location.protocol === 'https:';

  try {
    const session = await apiFetch('/api/auth/me');
    strip.className = 'status-strip state-secure';
    strip.innerHTML = `
      <span class="dot"></span>
      <span>${isSecure ? 'TLS session encrypted' : 'insecure connection'}</span>
      <span class="divider">&middot;</span>
      <span>Signed in as <strong>${escapeHtml(session.username)}</strong></span>
      <span class="divider">&middot;</span>
      <span class="role-tag">${escapeHtml(session.role)}</span>
    `;
  } catch {
    strip.className = 'status-strip state-guest';
    strip.innerHTML = `
      <span class="dot"></span>
      <span>${isSecure ? 'TLS session encrypted' : 'insecure connection'}</span>
      <span class="divider">&middot;</span>
      <span>Not signed in</span>
    `;
  }
}

document.addEventListener('DOMContentLoaded', initStatusStrip);