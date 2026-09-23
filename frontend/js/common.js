// All pages use the same small REST API helper.
export async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Request failed.');
  return data;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

export async function updateAccountNav() {
  const nav = document.querySelector('#account-nav');
  if (!nav) return null;
  const { user } = await api('/api/session');
  if (!user) return null;
  nav.innerHTML = `<strong>${escapeHtml(user.username)}</strong><a href="#" id="logout">Sign out</a>`;
  document.querySelector('#logout').addEventListener('click', async (event) => {
    event.preventDefault();
    await api('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });
  return user;
}
