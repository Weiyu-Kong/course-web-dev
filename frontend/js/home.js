import { api, escapeHtml, updateAccountNav } from './common.js';

updateAccountNav();
document.querySelector('#search-form').addEventListener('submit', searchTrains);

async function searchTrains(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.querySelector('#feedback');
  const results = document.querySelector('#results');
  const criteria = Object.fromEntries(new FormData(form));
  feedback.textContent = '';
  results.innerHTML = '<p class="loading">Searching…</p>';

  try {
    const data = await api(`/api/trains?${new URLSearchParams(criteria)}`);
    results.innerHTML = `
      <div class="section-heading">
        <div><span>STEP 2</span><h2>${escapeHtml(data.criteria.origin)} → ${escapeHtml(data.criteria.destination)}</h2></div>
        <p>${data.count} ${data.count === 1 ? 'result' : 'results'} · ${escapeHtml(data.trains[0]?.displayDate || data.criteria.date)}</p>
      </div>
      ${data.count ? data.trains.map(trainCard).join('') : '<div class="empty">No published trains match this search.</div>'}
    `;
  } catch (error) {
    feedback.textContent = error.message;
    results.innerHTML = '';
  }
}

function trainCard(train) {
  return `<article class="train-card">
    <strong class="train-number">${escapeHtml(train.trainNumber)}</strong>
    <div><small>Departure time</small><b>${escapeHtml(train.departureTime)}</b><span>${escapeHtml(train.departureLocation)}</span></div>
    <div class="route-line"><span>${train.durationMinutes} min</span><i></i></div>
    <div class="arrival"><small>Arrival time</small><b>${escapeHtml(train.arrivalTime)}</b><span>${escapeHtml(train.arrivalLocation)}</span></div>
    <a class="button dark" href="/booking.html?trainId=${train.id}&amp;date=${encodeURIComponent(train.serviceDate)}" aria-label="Book train ${escapeHtml(train.trainNumber)}">Book</a>
  </article>`;
}
