const express = require('express');
const router = express.Router();
const { calculateRates } = require('../services/logisticsService');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const Seller = require('../models/Seller');

// POST /api/v1/logistics/shipping-rates
router.post('/shipping-rates', async (req, res) => {
  const { originZipCode, destinationZipCode, parcelWeight, parcelLength, parcelWidth, parcelHeight } = req.body;

  // Validate inputs
  if (!originZipCode || !destinationZipCode || !parcelWeight || !parcelLength || !parcelWidth || !parcelHeight) {
    return res.status(400).json({ success: false, message: 'All zipcode, weight, and dimension parameters are required.' });
  }

  try {
    const rates = await calculateRates(originZipCode, destinationZipCode, parseFloat(parcelWeight), parseFloat(parcelLength), parseFloat(parcelWidth), parseFloat(parcelHeight));
    return res.status(200).json({ success: true, rates });
  } catch (error) {
    console.error('❌ [Shipping Rates API Error]', error);
    return res.status(500).json({ success: false, message: 'Internal server error calculating shipping rates.' });
  }
});

// GET /api/v1/logistics/shipments
router.get('/shipments', async (req, res) => {
  try {
    const shipments = await Shipment.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, shipments });
  } catch (error) {
    console.error('❌ [Fetch Shipments Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shipments.' });
  }
});

// POST /api/v1/logistics/tracking-update
// Unauthenticated webhook for shipping carriers
router.post('/tracking-update', async (req, res) => {
  const { trackingNumber, carrierStatus } = req.body;

  // Validate inputs
  if (!trackingNumber || !carrierStatus) {
    return res.status(400).json({ success: false, message: 'trackingNumber and carrierStatus are required.' });
  }

  console.log(`📥 [Tracking webhook received] Event for tracking #: ${trackingNumber} | Status: ${carrierStatus}`);

  try {
    // 1. Locate the Shipment
    const shipment = await Shipment.findOne({ trackingNumber });
    if (!shipment) {
      return res.status(404).json({ success: false, message: `Shipment with tracking number ${trackingNumber} not found.` });
    }

    let internalOrderStatus;
    let internalShippingStatus;
    let internalShipmentStatus;

    // 2. Map carrier status to internal statuses
    switch (carrierStatus.toUpperCase()) {
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        internalOrderStatus = 'Shipped';
        internalShippingStatus = 'Shipped';
        internalShipmentStatus = 'IN_TRANSIT';
        break;

      case 'OUT_FOR_DELIVERY':
        internalOrderStatus = 'Out for Delivery';
        internalShippingStatus = 'Out for Delivery';
        internalShipmentStatus = 'OUT_FOR_DELIVERY';
        break;

      case 'DELIVERED':
        internalOrderStatus = 'Completed';
        internalShippingStatus = 'Delivered';
        internalShipmentStatus = 'DELIVERED';
        break;

      default:
        return res.status(400).json({ success: false, message: `Unhandled carrier status mapping: ${carrierStatus}` });
    }

    // 3. Update Shipment model status
    shipment.shipmentStatus = internalShipmentStatus;
    await shipment.save();
    console.log(`📡 [Shipment status updated] Shipment ${shipment._id} status set to ${internalShipmentStatus}`);

    // 4. Update Order model status
    await Order.findByIdAndUpdate(shipment.orderId, {
      orderStatus: internalOrderStatus,
      shippingStatus: internalShippingStatus
    });
    console.log(`📦 [Order status updated] Order #${shipment.orderId} updated to ${internalOrderStatus} (Shipping: ${internalShippingStatus})`);

    return res.status(200).json({
      success: true,
      message: `Shipment status updated to ${internalShipmentStatus}`,
      details: {
        orderId: shipment.orderId,
        orderStatus: internalOrderStatus,
        shippingStatus: internalShippingStatus
      }
    });

  } catch (error) {
    console.error('❌ [Tracking Webhook Error]', error);
    return res.status(500).json({ success: false, message: 'Internal server error processing tracking update.' });
  }
});

// --- SHIPPING PARTNER PORTAL API ROUTE REGISTRATIONS ---

const ShippingPartner = require('../models/ShippingPartner');
const { generateToken } = require('../utils/token');
const { protectShippingPartner } = require('../middleware/authMiddleware');

// POST /api/v1/logistics/shipping/login
router.post('/shipping/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const partner = await ShippingPartner.findOne({ email: email.toLowerCase() });
    if (!partner) {
      return res.status(401).json({ success: false, message: 'Account not found for the specified email.' });
    }

    if (partner.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    const token = generateToken({
      shippingPartnerId: partner._id,
      email: partner.email,
      name: partner.name
    });

    res.cookie('shippingToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });

    console.log(`🚚 [Shipping Partner Logged In] ${partner.name}`);

    return res.status(200).json({
      success: true,
      token,
      shippingPartner: {
        _id: partner._id,
        name: partner.name,
        email: partner.email
      }
    });
  } catch (error) {
    console.error('❌ [Shipping Login Error] Failed:', error);
    return res.status(500).json({ success: false, message: 'Internal server error logging in.' });
  }
});

// GET /api/v1/logistics/shipping/orders
router.get('/shipping/orders', protectShippingPartner, async (req, res) => {
  try {
    const shipments = await Shipment.find({})
      .populate({
        path: 'orderId',
        populate: {
          path: 'sellerId',
          model: 'Seller'
        }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, shipments });
  } catch (error) {
    console.error('❌ [Fetch Assigned Shipments Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assigned shipments.' });
  }
});

// GET /api/v1/logistics/shipping/all-orders
// Returns all paid orders so shipping partner can see the full pipeline including pending seller confirmation
router.get('/shipping/all-orders', protectShippingPartner, async (req, res) => {
  try {
    const orders = await Order.find({
      paymentStatus: 'Paid',
      orderStatus: { $nin: ['Cancelled'] }
    })
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('❌ [Fetch All Orders for Shipping Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// GET /api/v1/logistics/shipping/orders/:id
router.get('/shipping/orders/:id', protectShippingPartner, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate({
        path: 'orderId',
        populate: {
          path: 'sellerId',
          model: 'Seller'
        }
      });
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }
    return res.status(200).json({ success: true, shipment });
  } catch (error) {
    console.error('❌ [Fetch Shipment Details Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shipment details.' });
  }
});

// POST /api/v1/logistics/shipping/orders/:id/status
router.post('/shipping/orders/:id/status', protectShippingPartner, async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    let internalOrderStatus;
    let internalShippingStatus;
    let internalShipmentStatus;

    switch (status.toUpperCase()) {
      case 'PICKED_UP':
        internalOrderStatus = 'Shipped';
        internalShippingStatus = 'Picked Up';
        internalShipmentStatus = 'PICKED_UP';
        break;

      case 'IN_TRANSIT':
        internalOrderStatus = 'Shipped';
        internalShippingStatus = 'In Transit';
        internalShipmentStatus = 'IN_TRANSIT';
        break;

      case 'OUT_FOR_DELIVERY':
        internalOrderStatus = 'Out for Delivery';
        internalShippingStatus = 'Out for Delivery';
        internalShipmentStatus = 'OUT_FOR_DELIVERY';
        break;

      case 'DELIVERED':
        internalOrderStatus = 'Completed';
        internalShippingStatus = 'Delivered';
        internalShipmentStatus = 'DELIVERED';
        break;

      case 'DELIVERY_FAILED':
        internalOrderStatus = 'Delivery Failed';
        internalShippingStatus = 'Delivery Failed';
        internalShipmentStatus = 'FAILED';
        break;

      default:
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    // Update shipment model status
    shipment.shipmentStatus = internalShipmentStatus;
    await shipment.save();

    // Update order model status
    const order = await Order.findByIdAndUpdate(shipment.orderId, {
      orderStatus: internalOrderStatus,
      shippingStatus: internalShippingStatus
    }, { new: true });

    console.log(`📡 [Shipment status updated] Shipment ${shipment._id} status set to ${internalShipmentStatus}. Order updated to ${internalOrderStatus}.`);

    return res.status(200).json({
      success: true,
      message: `Status updated successfully to ${status}`,
      shipment,
      order
    });
  } catch (error) {
    console.error('❌ [Update Shipment Status Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to update shipment status.' });
  }
});

module.exports = router;
