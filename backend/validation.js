class HttpError extends Error {
  constructor(status, message, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function nonWhitespaceLength(value) {
  return value.replace(/\s/g, '').length;
}

function validateSearch(input) {
  const data = {
    origin: text(input.origin),
    destination: text(input.destination),
    date: text(input.date),
  };
  if (!data.origin) throw new HttpError(400, 'Origin is required.', 'ORIGIN_REQUIRED');
  if (!data.destination) throw new HttpError(400, 'Destination is required.', 'DESTINATION_REQUIRED');
  if (!data.date) throw new HttpError(400, 'Date is required.', 'DATE_REQUIRED');
  if (data.origin.toLowerCase() === data.destination.toLowerCase()) {
    throw new HttpError(400, 'Origin and destination must be different.', 'SAME_CITY');
  }
  if (!parseIsoDate(data.date)) {
    throw new HttpError(400, 'Date must use YYYY-MM-DD format.', 'INVALID_DATE');
  }
  return data;
}

function validateServiceDate(value) {
  const date = text(value);
  if (!parseIsoDate(date)) {
    throw new HttpError(400, 'Date must use YYYY-MM-DD format.', 'INVALID_DATE');
  }
  return date;
}

function validateRegistration(input) {
  const data = {
    nationality: text(input.nationality),
    name: text(input.name),
    passportNumber: text(input.passportNumber),
    passportExpirationDate: text(input.passportExpirationDate),
    dateOfBirth: text(input.dateOfBirth),
    gender: text(input.gender),
    username: text(input.username),
    email: text(input.email).toLowerCase(),
    password: typeof input.password === 'string' ? input.password : '',
    confirmPassword: typeof input.confirmPassword === 'string' ? input.confirmPassword : '',
    acceptTerms: input.acceptTerms === true,
  };

  if (nonWhitespaceLength(data.nationality) < 2 || data.nationality.length > 60) {
    throw new HttpError(400, 'Nationality must contain 2 to 60 visible characters.', 'INVALID_NATIONALITY');
  }
  if (nonWhitespaceLength(data.name) < 2 || data.name.length > 100) {
    throw new HttpError(400, 'Name must contain 2 to 100 non-whitespace characters.', 'INVALID_NAME');
  }
  if (!data.passportNumber) throw new HttpError(400, 'Passport number is required.');
  if (!/^[A-Za-z0-9-]{6,30}$/.test(data.passportNumber)) {
    throw new HttpError(400, 'Passport number must contain 6 to 30 letters, digits, or hyphens.');
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const birthDate = parseIsoDate(data.dateOfBirth);
  const expirationDate = parseIsoDate(data.passportExpirationDate);
  if (!birthDate || birthDate >= todayUtc) {
    throw new HttpError(400, 'Date of birth must be in the past.');
  }
  if (!expirationDate || expirationDate <= todayUtc) {
    throw new HttpError(400, 'Passport expiration date must be in the future.');
  }
  if (!['Male', 'Female'].includes(data.gender)) {
    throw new HttpError(400, 'Please select a gender.');
  }
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(data.username)) {
    throw new HttpError(400, 'Invalid username: use 3 to 32 letters, digits, hyphens, or underscores.');
  }
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new HttpError(400, 'Enter a valid email address.', 'INVALID_EMAIL');
  }
  if (data.password.length < 12 || data.password.length > 128
    || !/[A-Z]/.test(data.password) || !/[a-z]/.test(data.password)
    || !/\d/.test(data.password) || !/[^A-Za-z0-9]/.test(data.password)) {
    throw new HttpError(400, 'Password needs 12 characters with uppercase, lowercase, number, and symbol.');
  }
  if (data.password !== data.confirmPassword) {
    throw new HttpError(400, 'Passwords do not match.', 'PASSWORD_MISMATCH');
  }
  if (!data.acceptTerms) throw new HttpError(400, 'You must accept the Terms of service.');
  return data;
}

function validateLogin(input) {
  const identifier = text(input.identifier);
  const password = typeof input.password === 'string' ? input.password : '';
  if (!identifier || !password) throw new HttpError(401, 'Invalid credentials.', 'INVALID_CREDENTIALS');
  return { identifier, password };
}

function validateBooking(input) {
  const data = {
    trainId: Number(input.trainId),
    passengerName: text(input.passengerName),
    idNumber: text(input.idNumber),
    nationality: text(input.nationality),
    ticketClass: text(input.ticketClass),
    ticketType: text(input.ticketType),
    idempotencyKey: text(input.idempotencyKey),
    acceptTerms: input.acceptTerms === true,
  };
  if (!Number.isInteger(data.trainId)) throw new HttpError(400, 'Select a valid train.');
  if (!data.passengerName) throw new HttpError(400, 'Passenger name is required.');
  if (nonWhitespaceLength(data.passengerName) < 2 || data.passengerName.length > 100) {
    throw new HttpError(400, 'Passenger name must contain 2 to 100 non-whitespace characters.');
  }
  if (!/^[A-Za-z0-9-]{6,30}$/.test(data.idNumber)) {
    throw new HttpError(400, 'ID number must contain 6 to 30 letters, digits, or hyphens.');
  }
  if (nonWhitespaceLength(data.nationality) < 2 || data.nationality.length > 60) {
    throw new HttpError(400, 'Nationality must contain 2 to 60 visible characters.');
  }
  const classes = ['standing ticket', 'Second Class', 'First Class', 'Business Class'];
  if (!classes.includes(data.ticketClass)) throw new HttpError(400, 'Select a valid ticket class.');
  if (!['Adult', 'Child', 'Student'].includes(data.ticketType)) {
    throw new HttpError(400, 'Select a valid ticket type.');
  }
  if (!data.acceptTerms) throw new HttpError(400, 'You must accept the Terms of service.');
  if (!/^[0-9a-f-]{36}$/i.test(data.idempotencyKey)) {
    throw new HttpError(400, 'A valid idempotency key is required.');
  }
  return data;
}

module.exports = {
  HttpError,
  validateSearch,
  validateServiceDate,
  validateRegistration,
  validateLogin,
  validateBooking,
};
