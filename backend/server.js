require('dotenv').config();

const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const express = require('express');
const db = require('./db');
const {
  HttpError,
  validateSearch,
  validateRegistration,
  validateLogin,
  validateBooking,
} = require('./validation');

const app = express();
const port = Number(process.env.PORT || 3000);
const frontendPath = path.join(__dirname, '../frontend');
const scrypt = promisify(crypto.scrypt);

app.use(express.json());
app.use(express.static(frontendPath));

// ---------- Small reusable helpers ----------

function mapTrain(row) {
  return {
    id: Number(row.id),
    trainNumber: row.train_number,
    originCity: row.origin_city,
    destinationCity: row.destination_city,
    departureStation: row.departure_station,
    arrivalStation: row.arrival_station,
    displayDate: row.display_date,
    departureTime: String(row.departure_time).slice(0, 5),
    arrivalTime: String(row.arrival_time).slice(0, 5),
    durationMinutes: Number(row.duration_minutes),
  };
}

function parseCookies(header = '') {
  const cookies = {};
  for (const item of header.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0) continue;
    cookies[item.slice(0, separator).trim()] = decodeURIComponent(item.slice(separator + 1).trim());
  }
  return cookies;
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}

async function passwordMatches(password, storedValue) {
  const [algorithm, salt, savedHex] = String(storedValue).split(':');
  if (algorithm !== 'scrypt' || !salt || !savedHex) return false;
  const saved = Buffer.from(savedHex, 'hex');
  const supplied = await scrypt(password, salt, saved.length);
  return crypto.timingSafeEqual(saved, supplied);
}

async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const hours = Number(process.env.SESSION_TTL_HOURS || 168);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  await db.execute(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    [tokenHash(token), userId, expiresAt.toISOString().slice(0, 19).replace('T', ' ')],
  );
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `rail_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${hours * 3600}${secure}`);
}

async function loadUser(req, _res, next) {
  try {
    const token = parseCookies(req.headers.cookie).rail_session;
    req.sessionToken = token || null;
    req.user = null;
    if (token) {
      const [rows] = await db.execute(
        `SELECT users.id, users.username, users.email, users.full_name
         FROM sessions JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > NOW()`,
        [tokenHash(token)],
      );
      req.user = rows[0] || null;
    }
    next();
  } catch (error) {
    next(error);
  }
}

function requireUser(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Please sign in to continue.', 'UNAUTHORIZED'));
  next();
}

app.use(loadUser);

// ---------- REST API: session and accounts ----------

app.get('/api/session', (req, res) => {
  const user = req.user
    ? { id: Number(req.user.id), username: req.user.username, email: req.user.email }
    : null;
  res.json({ user });
});

app.post('/api/register', async (req, res, next) => {
  try {
    const data = validateRegistration(req.body);
    const passwordHash = await hashPassword(data.password);
    const [result] = await db.execute(
      `INSERT INTO users
       (nationality, full_name, passport_number, passport_expiration_date,
        date_of_birth, gender, username, email, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.nationality, data.name, data.passportNumber, data.passportExpirationDate,
        data.dateOfBirth, data.gender, data.username, data.email, passwordHash],
    );
    await createSession(res, result.insertId);
    res.status(201).json({ user: { id: result.insertId, username: data.username, email: data.email } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const detail = `${error.message} ${error.sqlMessage}`.toLowerCase();
      if (detail.includes('email')) return next(new HttpError(409, 'Email already exists.', 'EMAIL_EXISTS'));
      if (detail.includes('passport')) return next(new HttpError(409, 'Passport number already exists.', 'PASSPORT_EXISTS'));
      return next(new HttpError(409, 'Username already exists.', 'USERNAME_EXISTS'));
    }
    next(error);
  }
});

app.post('/api/login', async (req, res, next) => {
  try {
    const data = validateLogin(req.body);
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ? OR LOWER(email) = LOWER(?) LIMIT 1',
      [data.identifier, data.identifier],
    );
    const user = rows[0];
    if (!user || !(await passwordMatches(data.password, user.password_hash))) {
      throw new HttpError(401, 'Invalid credentials.', 'INVALID_CREDENTIALS');
    }
    await createSession(res, user.id);
    res.json({ user: { id: Number(user.id), username: user.username, email: user.email } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/logout', async (req, res, next) => {
  try {
    if (req.sessionToken) {
      await db.execute('DELETE FROM sessions WHERE token_hash = ?', [tokenHash(req.sessionToken)]);
    }
    res.setHeader('Set-Cookie', 'rail_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// ---------- REST API: train queries ----------

app.get('/api/trains', async (req, res, next) => {
  try {
    const criteria = validateSearch(req.query);
    const [rows] = await db.execute(
      `SELECT * FROM trains
       WHERE LOWER(origin_city) = LOWER(?)
         AND LOWER(destination_city) = LOWER(?)
         AND LOWER(display_date) = LOWER(?)
         AND is_bookable = TRUE
       ORDER BY departure_time`,
      [criteria.from, criteria.to, criteria.date],
    );
    const trains = rows.map(mapTrain);
    res.json({ criteria, count: trains.length, trains });
  } catch (error) {
    next(error);
  }
});

app.get('/api/trains/:id', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM trains WHERE id = ? AND is_bookable = TRUE',
      [req.params.id],
    );
    if (!rows[0]) throw new HttpError(404, 'The selected train is unavailable.', 'TRAIN_NOT_FOUND');
    res.json({ train: mapTrain(rows[0]) });
  } catch (error) {
    next(error);
  }
});

// ---------- REST API: bookings ----------

app.post('/api/bookings', requireUser, async (req, res, next) => {
  try {
    const data = validateBooking(req.body);
    const [existing] = await db.execute(
      'SELECT booking_number FROM bookings WHERE user_id = ? AND idempotency_key = ?',
      [req.user.id, data.idempotencyKey],
    );
    let bookingNumber = existing[0]?.booking_number;
    if (!bookingNumber) {
      bookingNumber = `RB${Date.now().toString(36).toUpperCase()}${crypto.randomInt(100, 999)}`;
      await db.execute(
        `INSERT INTO bookings
         (booking_number, idempotency_key, user_id, train_id, passenger_name,
          passenger_id_number, passenger_nationality, ticket_class, ticket_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bookingNumber, data.idempotencyKey, req.user.id, data.trainId,
          data.passengerName, data.idNumber, data.nationality, data.ticketClass, data.ticketType],
      );
    }
    res.status(201).json({ bookingNumber });
  } catch (error) {
    next(error);
  }
});

app.get('/api/bookings/:number', requireUser, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT bookings.*, trains.train_number, trains.origin_city, trains.destination_city,
        trains.departure_station, trains.arrival_station, trains.display_date,
        trains.departure_time, trains.arrival_time, trains.duration_minutes
       FROM bookings JOIN trains ON trains.id = bookings.train_id
       WHERE bookings.booking_number = ? AND bookings.user_id = ?`,
      [req.params.number, req.user.id],
    );
    const row = rows[0];
    if (!row) throw new HttpError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
    res.json({
      booking: {
        bookingNumber: row.booking_number,
        passengerName: row.passenger_name,
        idNumber: row.passenger_id_number,
        nationality: row.passenger_nationality,
        ticketClass: row.ticket_class,
        ticketType: row.ticket_type,
        train: mapTrain({ ...row, id: row.train_id }),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Every API error has the same JSON shape, so frontend code stays simple.
app.use('/api', (req, _res, next) => next(new HttpError(404, `API route ${req.path} was not found.`, 'NOT_FOUND')));
app.use((error, _req, res, _next) => {
  const status = Number(error.status) || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: {
      code: error.code || 'SERVER_ERROR',
      message: status >= 500 ? 'The server could not complete the request.' : error.message,
    },
  });
});

db.query('SELECT 1')
  .then(() => app.listen(port, () => console.log(`Server: http://127.0.0.1:${port}`)))
  .catch((error) => {
    console.error('Cannot connect to MySQL:', error.message);
    process.exit(1);
  });
