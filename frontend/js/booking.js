import { api, escapeHtml, updateAccountNav } from './common.js';

const content = document.querySelector('#booking-content');
const params = new URLSearchParams(window.location.search);

start();

async function start() {
  try {
    const user = await updateAccountNav();
    const bookingNumber = params.get('bookingNumber');
    if (bookingNumber) return showCompletedBooking(user, bookingNumber);

    const trainId = params.get('trainId');
    if (!trainId) throw new Error('Select a train from the search page.');
    const { train } = await api(`/api/trains/${encodeURIComponent(trainId)}`);
    renderBookingPage(train, user);
  } catch (error) {
    content.innerHTML = messageCard(error.message);
  }
}

function renderBookingPage(train, user) {
  content.innerHTML = `
    <div class="section-heading"><div><span>STEP 3</span><h1>Train information</h1></div><p>${escapeHtml(train.displayDate)}</p></div>
    ${trainSummary(train)}
    ${user ? passengerForm(train) : messageCard('Please sign in to continue. A signed-in account is required to place an order.', true)}
  `;
  document.querySelector('#booking-form')?.addEventListener('submit', (event) => reviewOrder(event, train));
}

function trainSummary(train) {
  return `<article class="card ticket">
    <strong class="train-number">${escapeHtml(train.trainNumber)}</strong>
    <div><small>Departure time</small><b>${escapeHtml(train.departureTime)}</b><span>${escapeHtml(train.departureStation)} · ${escapeHtml(train.originCity)}</span></div>
    <div class="route-line"><span>${train.durationMinutes} min</span><i></i></div>
    <div class="arrival"><small>Arrival time</small><b>${escapeHtml(train.arrivalTime)}</b><span>${escapeHtml(train.arrivalStation)} · ${escapeHtml(train.destinationCity)}</span></div>
  </article>`;
}

function passengerForm(train) {
  return `<section class="card passenger-card">
    <div class="section-heading"><div><span>STEP 4</span><h2>Passenger information</h2></div></div>
    <form id="booking-form" class="booking-form" data-train-id="${train.id}" novalidate>
      <label>Ticket class<select name="ticketClass"><option value="">Please select</option><option>standing ticket</option><option>Second Class</option><option>First Class</option><option>Business Class</option></select></label>
      <label>Ticket type<select name="ticketType"><option value="">Please select</option><option>Adult</option><option>Child</option><option>Student</option></select></label>
      <label>Name<input name="passengerName"></label>
      <label>ID number<input name="idNumber"></label>
      <label>Nationality<input name="nationality"></label>
      <label class="checkbox-row"><input type="checkbox" name="acceptTerms"> I agree to the Terms of service.</label>
      <p id="feedback" class="feedback" role="alert"></p>
      <button class="button primary" type="submit">Place order</button>
    </form>
  </section>`;
}

function reviewOrder(event, train) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const data = Object.fromEntries(formData);
  data.acceptTerms = formData.has('acceptTerms');
  const validationMessage = validatePassenger(data);
  if (validationMessage) {
    document.querySelector('#feedback').textContent = validationMessage;
    return;
  }

  const dialog = document.createElement('dialog');
  dialog.innerHTML = `
    <h2>Please confirm the following information.</h2>
    ${trainSummary(train)}
    <dl class="review-list">
      <div><dt>Name</dt><dd>${escapeHtml(data.passengerName)}</dd></div>
      <div><dt>ID number</dt><dd>${escapeHtml(data.idNumber)}</dd></div>
      <div><dt>Nationality</dt><dd>${escapeHtml(data.nationality)}</dd></div>
      <div><dt>Ticket class</dt><dd>${escapeHtml(data.ticketClass)}</dd></div>
      <div><dt>Ticket type</dt><dd>${escapeHtml(data.ticketType)}</dd></div>
    </dl>
    <p class="feedback" role="alert"></p>
    <div class="dialog-actions"><button class="button light" data-close>Edit</button><button class="button primary" data-confirm>Confirm</button></div>`;
  document.body.append(dialog);
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('[data-confirm]').addEventListener('click', async (clickEvent) => {
    clickEvent.currentTarget.disabled = true;
    try {
      const result = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...data, trainId: train.id, idempotencyKey: crypto.randomUUID() }),
      });
      window.location.href = `/booking.html?bookingNumber=${encodeURIComponent(result.bookingNumber)}`;
    } catch (error) {
      dialog.querySelector('.feedback').textContent = error.message;
      clickEvent.currentTarget.disabled = false;
    }
  });
  dialog.showModal();
}

async function showCompletedBooking(user, bookingNumber) {
  if (!user) {
    content.innerHTML = messageCard('Please sign in to view this booking.', true);
    return;
  }
  const { booking } = await api(`/api/bookings/${encodeURIComponent(bookingNumber)}`);
  content.innerHTML = `
    <section class="success">
      <span class="success-icon">✓</span><p class="kicker">BOOKING COMPLETE</p><h1>Booking confirmed</h1>
      <p>Booking number: <strong>${escapeHtml(booking.bookingNumber)}</strong></p>
      ${trainSummary(booking.train)}
      <dl class="review-list card">
        <div><dt>Name</dt><dd>${escapeHtml(booking.passengerName)}</dd></div>
        <div><dt>ID number</dt><dd>${escapeHtml(booking.idNumber)}</dd></div>
        <div><dt>Nationality</dt><dd>${escapeHtml(booking.nationality)}</dd></div>
        <div><dt>Ticket class</dt><dd>${escapeHtml(booking.ticketClass)}</dd></div>
        <div><dt>Ticket type</dt><dd>${escapeHtml(booking.ticketType)}</dd></div>
      </dl>
      <a class="button dark" href="/">Search another journey</a>
    </section>`;
}

function validatePassenger(data) {
  if (!data.passengerName?.trim()) return 'Passenger name is required.';
  if (data.passengerName.trim().length < 2) return 'Passenger name must contain at least 2 characters.';
  if (!/^[A-Za-z0-9-]{6,30}$/.test(data.idNumber?.trim() || '')) return 'ID number must contain at least 6 letters, digits, or hyphens.';
  if (!data.nationality?.trim()) return 'Nationality is required.';
  if (!data.ticketClass) return 'Select a ticket class.';
  if (!data.ticketType) return 'Select a ticket type.';
  if (!data.acceptTerms) return 'You must accept the Terms of service.';
  return '';
}

function messageCard(message, showLinks = false) {
  return `<section class="card message-card"><h2>${escapeHtml(message)}</h2>${showLinks ? '<p><a class="button primary" href="/login.html">Login</a> <a href="/register.html">Register</a></p>' : '<a href="/">Return home</a>'}</section>`;
}
