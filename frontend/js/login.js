import { api, updateAccountNav } from './common.js';

updateAccountNav();
document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const feedback = document.querySelector('#feedback');
  feedback.textContent = '';
  try {
    await api('/api/sessions', { method: 'POST', body: JSON.stringify(data) });
    window.location.href = '/';
  } catch (error) {
    feedback.textContent = error.message;
  }
});
