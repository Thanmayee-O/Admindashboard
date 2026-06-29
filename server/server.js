require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { webhook } = require('./controllers/paymentController');
const paymentRoutes = require('./routes/paymentRoutes');
const logisticsRoutes = require('./routes/logisticsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Global Middlewares
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    return callback(null, origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'stripe-signature', 'Cookie'],
}));

app.use(morgan('dev'));

// Stripe Webhook Endpoint (MUST be configured before express.json() to receive raw buffer)
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), webhook);

// Standard JSON / URL-encoded body parsers for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic sanity check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Payment gateway server is healthy.' });
});

// Mount Routes
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/logistics', logisticsRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ [Unhandled Error]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
const { startPayoutWorker } = require('./jobs/payoutWorker');

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  startPayoutWorker();
});
