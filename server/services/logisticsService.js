const crypto = require('crypto');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');

/**
 * Dynamic Mock Shipping Rate Engine
 * Calculates Standard and Express rates based on zipcodes and dimensions
 */
const calculateRates = async (originZipCode, destinationZipCode, parcelWeight, parcelLength, parcelWidth, parcelHeight) => {
  console.log(`📦 [Shipping quote request received] Calculating rates from ${originZipCode} to ${destinationZipCode}`);

  // Base rates in cents
  const standardBase = 500; // $5.00
  const expressBase = 1500; // $15.00

  // Calculate weight charge ($1.50 per unit of weight)
  const weightCharge = Math.round(parcelWeight * 150);

  // Calculate dimensional volume charge ($0.05 per cubic unit)
  const volume = parcelLength * parcelWidth * parcelHeight;
  const volumeCharge = Math.round(volume * 5);

  const standardRate = standardBase + weightCharge + volumeCharge;
  const expressRate = expressBase + weightCharge + (volumeCharge * 1.5);

  const rates = [
    {
      carrierName: 'FedEx Ground Sandbox',
      serviceName: 'Standard Shipping',
      rate: standardRate, // in cents
      etaDays: 5,
      provider: 'FedEx'
    },
    {
      carrierName: 'DHL Express Sandbox',
      serviceName: 'Express Saver',
      rate: Math.round(expressRate), // in cents
      etaDays: 2,
      provider: 'DHL'
    }
  ];

  console.log(`📊 [Shipping quote generated] Standard: $${(standardRate/100).toFixed(2)} | Express: $${(expressRate/100).toFixed(2)}`);
  
  return rates;
};

/**
 * Automate Shipment booking and Air Waybill (AWB) generation
 * Triggered automatically when order is Paid
 */
const bookShipment = async (order) => {
  try {
    console.log(`🚚 [Shipment booking initiated] Booking shipment for Order #${order._id}`);

    // Mock defaults for parcel details since they were not collected at checkout
    const originZipCode = '90210';
    const destinationZipCode = '10001';
    const parcelWeight = 2.5; // kg
    const parcelLength = 12; // inches
    const parcelWidth = 10;
    const parcelHeight = 8;
    const carrierName = 'FedEx Ground Sandbox';
    const shippingRate = 850; // $8.50 in cents

    // Generate mock tracking and AWB numbers
    const trackingNumber = `TRK_FEDEX_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const awbNumber = `AWB_SR_${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const shippingLabelUrl = `https://shipping-partner.sandbox.api/labels/shipping_label_order_${order._id}.pdf`;

    console.log(`🎫 [AWB generated] ${awbNumber}`);
    console.log(`🏷️  [Tracking number generated] ${trackingNumber}`);

    // Create mock provider response payload
    const providerResponse = {
      status: 'SUCCESS',
      bookingId: `BK_${crypto.randomBytes(8).toString('hex')}`,
      labelGeneratedAt: new Date().toISOString(),
      pickupScheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    // 1. Create Shipment entry in MongoDB
    const shipment = await Shipment.create({
      orderId: order._id,
      trackingNumber,
      awbNumber,
      carrierName,
      shippingRate,
      shippingLabelUrl,
      originZipCode,
      destinationZipCode,
      parcelWeight,
      parcelLength,
      parcelWidth,
      parcelHeight,
      shipmentStatus: 'BOOKED',
      providerResponse,
    });

    console.log(`📄 [Shipping label saved] Label URL: ${shippingLabelUrl}`);

    // 2. Update corresponding Order
    await Order.findByIdAndUpdate(order._id, {
      shipmentId: shipment._id,
      trackingNumber,
      awbNumber,
      shippingLabelUrl,
      shippingStatus: 'Preparing Shipment',
    });

    console.log(`📦 [Shipment Created] Order #${order._id} successfully updated with Shipment ID: ${shipment._id}`);
    
  } catch (error) {
    console.error(`❌ [Shipment Booking Error] Failed for Order ${order._id}:`, error);
  }
};

module.exports = {
  calculateRates,
  bookShipment,
};
