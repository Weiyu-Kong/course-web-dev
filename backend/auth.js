const crypto = require('node:crypto');
const { promisify } = require('node:util');
const data = require('./db-access');
const { HttpError } = require('./validation');

const scrypt = promisify(crypto.scrypt);

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

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').filter((item) => item.includes('=')).map((item) => {
    const separator = item.indexOf('=');
    return [item.slice(0, separator).trim(), decodeURIComponent(item.slice(separator + 1).trim())];
  }));
}

async function startSession(res, travelerId) {
  const token = crypto.randomBytes(32).toString('hex');
  const hours = Number(process.env.SESSION_TTL_HOURS || 168);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ');
  await data.createSession(tokenHash(token), travelerId, expiresAt);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `rail_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${hours * 3600}${secure}`);
}

async function loadTraveler(req, _res, next) {
  try {
    const token = parseCookies(req.headers.cookie).rail_session;
    req.sessionToken = token || null;
    req.traveler = token ? await data.findTravelerBySession(tokenHash(token)) : null;
    next();
  } catch (error) {
    next(error);
  }
}

function requireTraveler(req, _res, next) {
  if (!req.traveler) return next(new HttpError(401, 'Please sign in to continue.', 'UNAUTHORIZED'));
  next();
}

function publicTraveler(traveler) {
  return {
    id: Number(traveler.id),
    username: traveler.username,
    email: traveler.email,
    name: traveler.name,
  };
}

module.exports = {
  tokenHash,
  hashPassword,
  passwordMatches,
  startSession,
  loadTraveler,
  requireTraveler,
  publicTraveler,
};
