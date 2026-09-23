const db = require('./db');

function mapTrain(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    trainNumber: row.train_number,
    serviceDate: row.service_date,
    displayDate: formatServiceDate(row.service_date),
    origin: row.origin,
    destination: row.destination,
    departureLocation: row.departure_location,
    departureTime: String(row.departure_time).slice(0, 5),
    arrivalLocation: row.arrival_location,
    arrivalTime: String(row.arrival_time).slice(0, 5),
    durationMinutes: Number(row.duration_minutes),
  };
}

function formatServiceDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

// DB Access: search trains using the three parameters from the REST API.
async function findTrains(origin, destination, date) {
  const [rows] = await db.execute(
    `SELECT * FROM Train
     WHERE LOWER(origin) = LOWER(?)
       AND LOWER(destination) = LOWER(?)
       AND service_date = ?
       AND is_bookable = TRUE
     ORDER BY departure_time`,
    [origin, destination, date],
  );
  return rows.map(mapTrain);
}

async function findTrainById(id) {
  const [rows] = await db.execute(
    'SELECT * FROM Train WHERE id = ? AND is_bookable = TRUE',
    [id],
  );
  return mapTrain(rows[0]);
}

async function createTraveler(traveler) {
  const [result] = await db.execute(
    `INSERT INTO Traveler
     (name, username, email, nationality, birth_date, gender,
      passport_no, passport_expiration_date, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [traveler.name, traveler.username, traveler.email, traveler.nationality,
      traveler.dateOfBirth, traveler.gender, traveler.passportNumber,
      traveler.passportExpirationDate, traveler.passwordHash],
  );
  return { id: result.insertId, ...traveler };
}

async function findTravelerByIdentifier(identifier) {
  const [rows] = await db.execute(
    `SELECT * FROM Traveler
     WHERE username = ? OR LOWER(email) = LOWER(?)
     LIMIT 1`,
    [identifier, identifier],
  );
  return rows[0] || null;
}

async function createSession(tokenHash, travelerId, expiresAt) {
  await db.execute(
    'INSERT INTO TravelerSession (token_hash, traveler_id, expires_at) VALUES (?, ?, ?)',
    [tokenHash, travelerId, expiresAt],
  );
}

async function findTravelerBySession(tokenHash) {
  const [rows] = await db.execute(
    `SELECT Traveler.*
     FROM TravelerSession
     JOIN Traveler ON Traveler.id = TravelerSession.traveler_id
     WHERE TravelerSession.token_hash = ? AND TravelerSession.expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function deleteSession(tokenHash) {
  await db.execute('DELETE FROM TravelerSession WHERE token_hash = ?', [tokenHash]);
}

async function findBookingByKey(passengerId, idempotencyKey) {
  const [rows] = await db.execute(
    `SELECT booking_no FROM Booking
     WHERE passenger_id = ? AND idempotency_key = ?`,
    [passengerId, idempotencyKey],
  );
  return rows[0] || null;
}

async function createBooking(booking) {
  await db.execute(
    `INSERT INTO Booking
     (booking_no, passenger_id, train_id, ticket_class, ticket_type,
      passenger_name, passenger_id_no, passenger_nationality, idempotency_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [booking.bookingNo, booking.passengerId, booking.trainId,
      booking.ticketClass, booking.ticketType, booking.passengerName,
      booking.idNumber, booking.nationality, booking.idempotencyKey],
  );
  return booking.bookingNo;
}

async function findBookingByNumber(bookingNo, passengerId) {
  const [rows] = await db.execute(
    `SELECT Booking.*, Train.*,
            Booking.id AS booking_id, Train.id AS train_id
     FROM Booking
     JOIN Train ON Train.id = Booking.train_id
     WHERE Booking.booking_no = ? AND Booking.passenger_id = ?`,
    [bookingNo, passengerId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    bookingNumber: row.booking_no,
    passengerName: row.passenger_name,
    idNumber: row.passenger_id_no,
    nationality: row.passenger_nationality,
    ticketClass: row.ticket_class,
    ticketType: row.ticket_type,
    train: mapTrain({ ...row, id: row.train_id }),
  };
}

async function checkConnection() {
  await db.query('SELECT 1');
}

module.exports = {
  findTrains,
  findTrainById,
  createTraveler,
  findTravelerByIdentifier,
  createSession,
  findTravelerBySession,
  deleteSession,
  findBookingByKey,
  createBooking,
  findBookingByNumber,
  checkConnection,
};
