const crypto = require('node:crypto');
const data = require('./db-access');
const {
  HttpError,
  validateSearch,
  validateRegistration,
  validateLogin,
  validateBooking,
} = require('./validation');
const {
  tokenHash,
  hashPassword,
  passwordMatches,
  startSession,
  publicTraveler,
} = require('./auth');

// Controller: GET /api/trains?origin=...&destination=...&date=...
async function searchTrains(req, res, next) {
  try {
    // 1. Read parameters from the request.
    const criteria = validateSearch(req.query);

    // 2. Ask the DB Access function for matching trains.
    const trains = await data.findTrains(
      criteria.origin,
      criteria.destination,
      criteria.date,
    );

    // 3. Return a JSON response to the client.
    res.json({ criteria, count: trains.length, trains });
  } catch (error) {
    next(error);
  }
}

async function getTrain(req, res, next) {
  try {
    const train = await data.findTrainById(req.params.id);
    if (!train) throw new HttpError(404, 'The selected train is unavailable.', 'TRAIN_NOT_FOUND');
    res.json({ train });
  } catch (error) {
    next(error);
  }
}

async function registerTraveler(req, res, next) {
  try {
    // 1. Validate and normalize the request body.
    const traveler = validateRegistration(req.body);

    // 2. Hash the password before it reaches the database.
    traveler.passwordHash = await hashPassword(traveler.password);

    // 3. Create the Traveler row and a persistent login session.
    const created = await data.createTraveler(traveler);
    await startSession(res, created.id);

    // 4. Never return the password or password hash.
    res.status(201).json({ user: publicTraveler(created) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const detail = `${error.message} ${error.sqlMessage}`.toLowerCase();
      if (detail.includes('email')) return next(new HttpError(409, 'Email already exists.', 'EMAIL_EXISTS'));
      if (detail.includes('passport')) return next(new HttpError(409, 'Passport number already exists.', 'PASSPORT_EXISTS'));
      return next(new HttpError(409, 'Username already exists.', 'USERNAME_EXISTS'));
    }
    next(error);
  }
}

async function loginTraveler(req, res, next) {
  try {
    const credentials = validateLogin(req.body);
    const traveler = await data.findTravelerByIdentifier(credentials.identifier);
    const valid = traveler && await passwordMatches(credentials.password, traveler.password_hash);
    if (!valid) throw new HttpError(401, 'Invalid credentials.', 'INVALID_CREDENTIALS');
    await startSession(res, traveler.id);
    res.json({ user: publicTraveler(traveler) });
  } catch (error) {
    next(error);
  }
}

async function getSession(req, res) {
  res.json({ user: req.traveler ? publicTraveler(req.traveler) : null });
}

async function logoutTraveler(req, res, next) {
  try {
    if (req.sessionToken) await data.deleteSession(tokenHash(req.sessionToken));
    res.setHeader('Set-Cookie', 'rail_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

async function createBooking(req, res, next) {
  try {
    const booking = validateBooking(req.body);
    const train = await data.findTrainById(booking.trainId);
    if (!train) throw new HttpError(404, 'The selected train is unavailable.', 'TRAIN_NOT_FOUND');

    const existing = await data.findBookingByKey(req.traveler.id, booking.idempotencyKey);
    let bookingNo = existing?.booking_no;
    if (!bookingNo) {
      bookingNo = `RB${Date.now().toString(36).toUpperCase()}${crypto.randomInt(100, 999)}`;
      try {
        await data.createBooking({ ...booking, bookingNo, passengerId: req.traveler.id });
      } catch (error) {
        // A repeated request may reach the unique key before the first lookup.
        if (error.code !== 'ER_DUP_ENTRY') throw error;
        const duplicate = await data.findBookingByKey(req.traveler.id, booking.idempotencyKey);
        if (!duplicate) throw error;
        bookingNo = duplicate.booking_no;
      }
    }
    res.status(201).json({ bookingNumber: bookingNo });
  } catch (error) {
    next(error);
  }
}

async function getBooking(req, res, next) {
  try {
    const booking = await data.findBookingByNumber(req.params.number, req.traveler.id);
    if (!booking) throw new HttpError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
    res.json({ booking });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchTrains,
  getTrain,
  registerTraveler,
  loginTraveler,
  getSession,
  logoutTraveler,
  createBooking,
  getBooking,
};
