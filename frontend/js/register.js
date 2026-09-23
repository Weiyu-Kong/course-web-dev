import { api, updateAccountNav } from './common.js';

updateAccountNav();
document.querySelector('#register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  data.acceptTerms = formData.has('acceptTerms');
  const feedback = document.querySelector('#feedback');
  feedback.textContent = '';

  try {
    await api('/api/travelers', { method: 'POST', body: JSON.stringify(data) });
    window.location.href = '/';
  } catch (error) {
    feedback.textContent = error.message;
  }
});
