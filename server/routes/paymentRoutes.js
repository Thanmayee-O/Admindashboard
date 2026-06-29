const express = require('express');
const router = express.Router();
const {
  checkout,
  getProducts,
  getSellers,
  getSellerDashboard,
  getOrders,
  getOrderById,
  createRazorpayOrder,
  verifyRazorpayPayment,
  sellerLogin,
  getSellerOrders,
  acceptOrder,
  rejectOrder,
  getSellerEarnings
} = require('../controllers/paymentController');
const { protectSeller } = require('../middleware/authMiddleware');

// GET /api/v1/payments/products
router.get('/products', getProducts);

// GET /api/v1/payments/sellers
router.get('/sellers', getSellers);

// GET /api/v1/payments/sellers/:id/dashboard
router.get('/sellers/:id/dashboard', getSellerDashboard);

// GET /api/v1/payments/orders
router.get('/orders', getOrders);

// GET /api/v1/payments/orders/:id
router.get('/orders/:id', getOrderById);

// POST /api/v1/payments/checkout
router.post('/checkout', checkout);

// Razorpay checkout endpoints
router.post('/razorpay/create-order', createRazorpayOrder);
router.post('/razorpay/verify-payment', verifyRazorpayPayment);

// Seller Dashboard endpoints
router.post('/seller/login', sellerLogin);
router.get('/seller/orders', protectSeller, getSellerOrders);
router.post('/seller/orders/:id/accept', protectSeller, acceptOrder);
router.post('/seller/orders/:id/reject', protectSeller, rejectOrder);
router.get('/seller/earnings', protectSeller, getSellerEarnings);

module.exports = router;
