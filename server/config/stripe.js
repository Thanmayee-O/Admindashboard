const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  WARNING: STRIPE_SECRET_KEY is not defined in environment variables.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_placeholder_key', {
  apiVersion: '2023-10-16', // Pinning the API version for consistent SDK behavior
});

module.exports = stripe;
