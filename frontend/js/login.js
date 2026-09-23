import { api, updateAccountNav } from './common.js';

updateAccountNav();
document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const feedback = document.querySelector('#feedback');
  feedback.textContent = '';
  submitButton.disabled = true;
  try {
    await api('/api/sessions', { method: 'POST', body: JSON.stringify(data) });
    const returnTo = new URLSearchParams(window.location.search).get('returnTo');
    window.location.href = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  } catch (error) {
    feedback.textContent = error.message;
    submitButton.disabled = false;
  }
});
