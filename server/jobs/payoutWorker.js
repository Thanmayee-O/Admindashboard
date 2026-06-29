const cron = require('node-cron');
const crypto = require('crypto');
const Seller = require('../models/Seller');
const SellerLedger = require('../models/SellerLedger');
const PayoutLog = require('../models/PayoutLog');
const Order = require('../models/Order');

/**
 * Payout processing worker logic
 */
const processPayouts = async () => {
  try {
    const now = new Date();
    // 1. Fetch pending escrow entries that have matured past the 3-minute return window
    const maturedLedgers = await SellerLedger.find({
      status: 'Pending',
      releaseDate: { $lte: now },
    });

    if (maturedLedgers.length === 0) {
      return;
    }

    console.log(`⏰ [Cron Job Triggered] Processing ${maturedLedgers.length} matured escrow payouts...`);

    for (const ledger of maturedLedgers) {
      const seller = await Seller.findById(ledger.sellerId);
      
      if (!seller) {
        console.error(`❌ [Reconciliation Error] Seller not found for ledger entry: ${ledger._id}`);
        // Mark failed
        ledger.status = 'Failed';
        await ledger.save();
        continue;
      }

      console.log(`💸 [Payout initiated] Processing payout release of $${(ledger.netPayout / 100).toFixed(2)} to ${seller.name} for Order #${ledger.orderId}`);

      // 2. Perform fail-safe check on Seller status
      if (seller.accountStatus === 'Active') {
        // Safe transfer: Move pending balance to available balance and total earnings
        seller.pendingBalance = Math.max(0, seller.pendingBalance - ledger.netPayout);
        seller.availableBalance += ledger.netPayout;
        seller.totalEarnings += ledger.netPayout;
        await seller.save();

        // Update ledger status
        ledger.status = 'Released';
        await ledger.save();

        // Update order status
        await Order.findByIdAndUpdate(ledger.orderId, { payoutStatus: 'Released' });

        // Generate success log
        const txnRef = `TXN_CHASE_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
        await PayoutLog.create({
          sellerId: seller._id,
          orderId: ledger.orderId,
          amount: ledger.netPayout,
          payoutStatus: 'Success',
          transactionReference: txnRef,
        });

        console.log(`✅ [Payout successful] Transferred $${(ledger.netPayout / 100).toFixed(2)} to ${seller.name}'s mock Chase Bank account. Ref: ${txnRef}`);
      } else {
        // Reconciliation fail-safe: account Restricted or Locked
        const reason = `Seller account status is ${seller.accountStatus}`;
        console.warn(`🛑 [Payout failed] Escrow release rejected. Seller: ${seller.name} (Status: ${seller.accountStatus}). Reason: ${reason}`);

        // Update ledger status to Failed (funds remain locked in seller's pendingBalance)
        ledger.status = 'Failed';
        await ledger.save();

        // Update order status
        await Order.findByIdAndUpdate(ledger.orderId, { payoutStatus: 'Failed' });

        // Generate failed log
        const failRef = `FAIL_REF_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
        await PayoutLog.create({
          sellerId: seller._id,
          orderId: ledger.orderId,
          amount: ledger.netPayout,
          payoutStatus: 'Failed',
          failureReason: reason,
          transactionReference: failRef,
        });

        console.log(`⚠️  [Reconciliation complete] Blocked funds kept in pending balance. Failed PayoutLog created.`);
      }
    }
  } catch (error) {
    console.error('❌ [Payout Cron Worker Error]', error);
  }
};

// Schedule job to run every 30 seconds
const startPayoutWorker = () => {
  console.log('⏱️  Background Payout Cron Job initialized (interval: 30s).');
  // Runs every 30 seconds
  cron.schedule('*/30 * * * * *', processPayouts);
};

module.exports = {
  startPayoutWorker,
  processPayouts,
};
