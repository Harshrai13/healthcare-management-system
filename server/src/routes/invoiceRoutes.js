const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const invoiceController = require('../controllers/invoiceController');

router.get('/', authenticate, invoiceController.getInvoices);
router.get('/payments/history', authenticate, invoiceController.getPaymentHistory);
router.get('/:id', authenticate, invoiceController.getInvoiceById);
router.get('/:id/pdf', authenticate, invoiceController.downloadInvoicePDF);
router.get('/receipt/:id/pdf', authenticate, invoiceController.downloadReceiptPDF);
router.post('/', authenticate, authorize('BILLING_STAFF', 'SUPER_ADMIN'), invoiceController.createInvoice);
router.put('/:id', authenticate, authorize('BILLING_STAFF', 'SUPER_ADMIN'), invoiceController.updateInvoice);
router.delete('/:id', authenticate, authorize('BILLING_STAFF', 'SUPER_ADMIN'), invoiceController.deleteInvoice);
router.post('/:id/payment-intent', authenticate, invoiceController.createPaymentIntent);
router.post('/:id/create-razorpay-order', authenticate, invoiceController.createRazorpayOrder);
router.post('/:id/verify-razorpay-payment', authenticate, invoiceController.verifyRazorpayPayment);
router.post('/:id/pay', authenticate, invoiceController.processPayment);
router.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), invoiceController.razorpayWebhook);
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), invoiceController.stripeWebhook);

module.exports = router;
