require('dotenv').config();

const path = require('node:path');
const express = require('express');
const { HttpError } = require('./validation');
const { loadTraveler, requireTraveler } = require('./auth');
const { checkConnection } = require('./db-access');
const {
  searchTrains,
  getTrain,
  registerTraveler,
  loginTraveler,
  getSession,
  logoutTraveler,
  createBooking,
  getBooking,
} = require('./controllers');

const app = express();
const port = Number(process.env.PORT || 3000);
const frontendPath = path.join(__dirname, '../frontend');

// Middleware: parse JSON, serve frontend files, and load the current traveler.
app.use(express.json());
app.use(express.static(frontendPath));
app.use(loadTraveler);

// RESTful routes map HTTP resources to controller functions.
app.get('/api/trains', searchTrains);
app.get('/api/trains/:id', getTrain);
app.post('/api/travelers', registerTraveler);
app.post('/api/sessions', loginTraveler);
app.get('/api/session', getSession);
app.delete('/api/session', logoutTraveler);
app.post('/api/bookings', requireTraveler, createBooking);
app.get('/api/bookings/:number', requireTraveler, getBooking);

// Return the same JSON error shape from every API endpoint.
app.use('/api', (req, _res, next) => {
  next(new HttpError(404, `API route ${req.path} was not found.`, 'NOT_FOUND'));
});

app.use((error, _req, res, _next) => {
  const status = Number(error.status) || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: {
      code: error.code || 'SERVER_ERROR',
      message: status >= 500
        ? 'The server could not complete the request.'
        : error.message,
    },
  });
});

// Start the web server only after the DB connection succeeds.
checkConnection()
  .then(() => app.listen(port, () => {
    console.log(`Server: http://localhost:${port}`);
  }))
  .catch((error) => {
    console.error('Cannot connect to MySQL:', error.message);
    process.exit(1);
  });
