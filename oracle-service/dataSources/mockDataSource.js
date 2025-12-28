/**
 * Mock Data Source for Oracle Service
 *
 * FOR HACKATHON DEMONSTRATION ONLY
 *
 * This simulates invoice verification and payment tracking.
 * In production, replace with real API integrations:
 * - QuickBooks API
 * - Xero API
 * - SAP integration
 * - Banking APIs
 * - Direct debtor verification
 */

const logger = require('../logger');

class MockDataSource {
  constructor() {
    // Simulated database of invoice statuses
    this.invoiceVerifications = new Map();
    this.paymentStatuses = new Map();

    // Configuration
    this.verificationSuccessRate = 0.95; // 95% of invoices verify successfully
    this.paymentProbability = 0.7;       // 70% chance invoice gets paid
    this.minPaymentDelay = 10000;        // Min 10 seconds before payment
    this.maxPaymentDelay = 120000;       // Max 2 minutes before payment

    logger.info('📊 Mock Data Source initialized');
    logger.info(`   Success rate: ${this.verificationSuccessRate * 100}%`);
    logger.info(`   Payment probability: ${this.paymentProbability * 100}%`);
  }

  /**
   * Verify invoice authenticity
   *
   * In production, this would:
   * - Check invoice PDF against accounting system
   * - Verify debtor exists and is creditworthy
   * - Confirm invoice amount matches
   * - Check for duplicate invoices
   *
   * @param {Object} invoice Invoice data
   * @returns {Promise<boolean>} True if valid
   */
  async verifyInvoice(invoice) {
    logger.info(`   📋 Mock verification for invoice ${invoice.tokenId}`);

    // Simulate API delay
    await this.delay(2000);

    // Check if already verified
    if (this.invoiceVerifications.has(invoice.tokenId)) {
      return this.invoiceVerifications.get(invoice.tokenId);
    }

    // Random verification result (with high success rate)
    const isValid = Math.random() < this.verificationSuccessRate;

    this.invoiceVerifications.set(invoice.tokenId, isValid);

    if (isValid) {
      logger.info(`   ✅ Mock: Invoice authentic`);
      logger.info(`   ✅ Mock: Debtor verified`);
      logger.info(`   ✅ Mock: Amount confirmed`);

      // Schedule mock payment
      this.schedulePayment(invoice);
    } else {
      logger.warn(`   ❌ Mock: Verification failed (random failure for testing)`);
    }

    return isValid;
  }

  /**
   * Check payment status for an invoice
   *
   * In production, this would:
   * - Query bank APIs for wire transfers
   * - Check payment gateways
   * - Poll debtor's accounting system
   * - Verify settlement confirmations
   *
   * @param {Object} invoice Invoice data
   * @returns {Promise<Object>} Payment information
   */
  async checkPaymentStatus(invoice) {
    const tokenId = invoice.tokenId;

    // Check if payment was scheduled and is ready
    if (this.paymentStatuses.has(tokenId)) {
      const paymentInfo = this.paymentStatuses.get(tokenId);

      if (Date.now() >= paymentInfo.scheduledTime) {
        // Payment is due
        return {
          hasPaid: true,
          amount: paymentInfo.amount,
          paidAt: Date.now(),
        };
      }
    }

    // No payment yet
    return {
      hasPaid: false,
      amount: 0,
    };
  }

  /**
   * Schedule a mock payment (simulates debtor paying after some time)
   *
   * In production, this would be replaced by actual payment monitoring
   */
  schedulePayment(invoice) {
    // Decide if this invoice will be paid
    const willPay = Math.random() < this.paymentProbability;

    if (!willPay) {
      logger.info(`   ⚠️  Mock: Invoice scheduled to default (for testing)`);
      return;
    }

    // Random delay before payment
    const delay = Math.floor(
      Math.random() * (this.maxPaymentDelay - this.minPaymentDelay) + this.minPaymentDelay
    );

    const scheduledTime = Date.now() + delay;
    const faceValue = BigInt(invoice.faceValue);

    // 90% of time pay full amount, 10% partial payment
    const isPartial = Math.random() < 0.1;
    const amount = isPartial ? (faceValue * 50n) / 100n : faceValue;

    this.paymentStatuses.set(invoice.tokenId, {
      scheduledTime,
      amount: amount.toString(),
      isPartial,
    });

    logger.info(`   💰 Mock: Payment scheduled in ${Math.floor(delay / 1000)}s`);
    logger.info(`   💵 Mock: Amount: ${isPartial ? '50%' : '100%'} of face value`);
  }

  /**
   * Simulate API delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get data source statistics
   */
  getStats() {
    return {
      totalVerifications: this.invoiceVerifications.size,
      successfulVerifications: Array.from(this.invoiceVerifications.values()).filter(v => v).length,
      pendingPayments: this.paymentStatuses.size,
    };
  }

  /**
   * Reset data source (for testing)
   */
  reset() {
    this.invoiceVerifications.clear();
    this.paymentStatuses.clear();
    logger.info('🔄 Mock data source reset');
  }
}

module.exports = MockDataSource;
