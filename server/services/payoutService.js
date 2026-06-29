const Seller = require('../models/Seller');
const SellerLedger = require('../models/SellerLedger');

/**
 * Split Payout calculation logic.
 * Net Payout = Gross Sales - Platform Commission (12%) - Payment Gateway Fees ($0.30) - Logistics - Taxes - Reserve
 */
const calculateSplit = (grossSales, logisticsCost = 0, taxes = 0, adjustmentsReserve = 0) => {
  // Platform Commission is 12% of Gross Sales
  const platformCommission = Math.round(grossSales * 0.12);
  
  // Fixed Gateway Processing Fee is 30 cents ($0.30)
  const paymentGatewayFees = 30; // 30 cents

  const platformShare = platformCommission + paymentGatewayFees;
  const netPayout = grossSales - platformCommission - paymentGatewayFees - logisticsCost - taxes - adjustmentsReserve;

  return {
    grossSales,
    platformCommission,
    paymentGatewayFees,
    logisticsCost,
    taxes,
    adjustmentsReserve,
    platformShare,
    netPayout
  };
};

/**
 * Triggered on Order Payment Success.
 * Allocates seller earnings into pending balance, registers pending ledger, sets 3-minute escrow window.
 */
const allocateEscrow = async (order) => {
  try {
    const seller = await Seller.findById(order.sellerId);
    if (!seller) {
      console.warn(`⚠️  [Payout Service Warning] No seller found for ID: ${order.sellerId} (Order ID: ${order._id})`);
      return;
    }

    console.log(`💰 [Payment received] Order #${order._id} paid. Allocating seller payouts...`);

    // 1. Calculate splits
    const split = calculateSplit(order.totalAmount);
    console.log(`📊 [Split calculation completed] Order: ${order._id}. Gross: $${(split.grossSales / 100).toFixed(2)} | Platform Share: $${(split.platformShare / 100).toFixed(2)} | Net Payout to Seller: $${(split.netPayout / 100).toFixed(2)}`);

    // 2. Scheduled escrow window of 3 minutes
    const escrowDurationMs = 3 * 60 * 1000; // 3 minutes
    const releaseDate = new Date(Date.now() + escrowDurationMs);

    // 3. Create SellerLedger entry in Pending state
    const ledger = await SellerLedger.create({
      sellerId: seller._id,
      orderId: order._id,
      grossSales: split.grossSales,
      platformCommission: split.platformCommission,
      paymentGatewayFees: split.paymentGatewayFees,
      logisticsCost: split.logisticsCost,
      taxes: split.taxes,
      adjustmentsReserve: split.adjustmentsReserve,
      netPayout: split.netPayout,
      status: 'Pending',
      releaseDate,
    });
    console.log(`🛡️  [Escrow created] Escrow record created in ledger. Releasing on: ${releaseDate.toISOString()}`);

    // 4. Update Seller pending balance
    await Seller.findByIdAndUpdate(seller._id, {
      $inc: { pendingBalance: split.netPayout }
    });
    console.log(`🏦 [Seller pending balance updated] Incremented pending balance of ${seller.name} by $${(split.netPayout / 100).toFixed(2)}`);

  } catch (error) {
    console.error(`❌ [Escrow Allocation Error] Failed for Order ${order._id}:`, error);
  }
};

module.exports = {
  calculateSplit,
  allocateEscrow,
};
