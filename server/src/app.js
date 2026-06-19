const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { handleUploadError } = require('./middleware/upload');
const { generalLimiter } = require('./middleware/rateLimiter');
const { stripeWebhook } = require('./controllers/invoiceController');
const logger = require('./utils/logger');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());

// Stripe webhook needs raw body for signature verification (before JSON parser)
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security: prevent HTTP parameter pollution
app.use(hpp());

// Security: sanitize MongoDB query operators from user input
app.use(mongoSanitize());

app.use(generalLimiter);

const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(morgan('combined', { stream: morganStream }));

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'VerdantCare API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', routes);

app.use(handleUploadError);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
