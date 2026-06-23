const mongoose = require('mongoose');
const crypto = require('crypto');
const { Invoice, Payment } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');
const logger = require('../utils/logger');
const { notifyBillingReminder } = require('../utils/notificationService');
const { getStripe } = require('../config/stripe');
const { getRazorpay } = require('../config/razorpay');
const { generateInvoicePDF, generateReceiptPDF } = require('../utils/pdfGenerator');

async function getInvoices(req, res, next) {
  try {
    const { status, search, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (req.user.role === 'PATIENT') where.patientId = req.user.id;
    if (status) where.status = status;

    // Search by patient name or invoice ID
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const patientIds = await mongoose.model('User').find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
        ],
      }).select('_id');

      where.$or = [
        { patientId: { $in: patientIds.map((p) => p._id) } },
        { _id: mongoose.Types.ObjectId.isValid(search) ? search : null },
      ].filter((condition) => condition.patientId || condition._id);
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.$gte = new Date(dateFrom);
      if (dateTo) where.createdAt.$lte = new Date(dateTo);
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(where)
        .populate({ path: 'patientId', select: 'firstName lastName email' })
        .populate({ path: 'appointmentId', populate: { path: 'serviceId', select: 'name' } })
        .populate('payments')
        .skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      Invoice.countDocuments(where),
    ]);

    res.json({
      success: true,
      data: { invoices, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } },
    });
  } catch (error) {
    next(error);
  }
}

async function getInvoiceById(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({ path: 'patientId', select: 'firstName lastName email phone' })
      .populate({ path: 'appointmentId', populate: { path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } } })
      .populate('payments');

    if (!invoice) throw new AppError('Invoice not found.', 404, ErrorCodes.NOT_FOUND);
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

async function createInvoice(req, res, next) {
  try {
    const { patientId, appointmentId, items, subtotal, tax, total, dueDate } = req.body;

    // If doctor is creating, validate appointment belongs to their patients
    if (req.user.role === 'DOCTOR') {
      const DoctorProfile = require('../models/DoctorProfile');
      const Appointment = require('../models/Appointment');
      const doctorProfile = await DoctorProfile.findOne({ userId: req.user.id }).select('_id');
      if (!doctorProfile) throw new AppError('Doctor profile not found.', 404, ErrorCodes.NOT_FOUND);
      const appointment = await Appointment.findOne({ _id: appointmentId, doctorId: doctorProfile._id });
      if (!appointment) throw new AppError('Appointment not found or does not belong to you.', 404, ErrorCodes.NOT_FOUND);
    }

    // Auto-calculate subtotal and total from items if not provided
    let calcSubtotal = subtotal;
    let calcTotal = total;
    if (items && items.length > 0 && !calcSubtotal) {
      calcSubtotal = items.reduce((sum, item) => sum + ((item.quantity || 1) * (item.rate || 0)), 0);
    }
    if (calcSubtotal !== undefined && calcTotal === undefined) {
      calcTotal = calcSubtotal + (tax || 0);
    }

    const invoice = await Invoice.create({
      patientId, appointmentId, items,
      subtotal: calcSubtotal, tax: tax || 0, total: calcTotal,
      dueDate: new Date(dueDate), status: 'PENDING',
    });
    await invoice.populate({ path: 'patientId', select: 'firstName lastName email' });
    setImmediate(() => {
      notifyBillingReminder(invoice).catch((err) => logger.error('Notification error', { err: err.message }));
    });
    res.status(201).json({ success: true, message: 'Invoice created.', data: invoice });
  } catch (error) {
    next(error);
  }
}

async function getDoctorInvoices(req, res, next) {
  try {
    const DoctorProfile = require('../models/DoctorProfile');
    const Appointment = require('../models');
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const doctorProfile = await DoctorProfile.findOne({ userId: req.user.id }).select('_id');
    if (!doctorProfile) throw new AppError('Doctor profile not found.', 404, ErrorCodes.NOT_FOUND);

    // Get all appointment IDs for this doctor
    const appointments = await Appointment.Appointment.find({ doctorId: doctorProfile._id }).select('_id');
    const appointmentIds = appointments.map((a) => a._id);

    const where = { appointmentId: { $in: appointmentIds } };

    const [invoices, total] = await Promise.all([
      Invoice.find(where)
        .populate({ path: 'patientId', select: 'firstName lastName email' })
        .populate({ path: 'appointmentId', populate: { path: 'serviceId', select: 'name' } })
        .populate('payments')
        .skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      Invoice.countDocuments(where),
    ]);

    res.json({
      success: true,
      data: { invoices, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } },
    });
  } catch (error) {
    next(error);
  }
}

async function updateInvoice(req, res, next) {
  try {
    const { items, subtotal, tax, total, dueDate, status } = req.body;
    const updateData = {};
    if (items) updateData.items = items;
    if (subtotal !== undefined) updateData.subtotal = subtotal;
    if (tax !== undefined) updateData.tax = tax;
    if (total !== undefined) updateData.total = total;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (status) updateData.status = status;

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate({ path: 'patientId', select: 'firstName lastName email' });

    if (!invoice) throw new AppError('Invoice not found.', 404, ErrorCodes.NOT_FOUND);
    logger.info('Invoice updated', { invoiceId: invoice._id });
    res.json({ success: true, message: 'Invoice updated.', data: invoice });
  } catch (error) {
    next(error);
  }
}

async function deleteInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new AppError('Invoice not found.', 404, ErrorCodes.NOT_FOUND);
    if (invoice.status === 'PAID') throw new AppError('Cannot delete a paid invoice.', 400, ErrorCodes.VALIDATION_ERROR);

    invoice.status = 'CANCELLED';
    await invoice.save();
    logger.info('Invoice cancelled', { invoiceId: invoice._id });
    res.json({ success: true, message: 'Invoice cancelled.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a Stripe PaymentIntent for an invoice
 */
async function createPaymentIntent(req, res, next) {
  try {
    const stripe = await getStripe();
    if (!stripe) throw new AppError('Stripe payment processing is not configured. Please try Razorpay or contact support.', 503, ErrorCodes.SERVICE_UNAVAILABLE);

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new AppError('Invoice not found.', 404, ErrorCodes.NOT_FOUND);
    if (invoice.status === 'PAID') throw new AppError('This invoice has already been paid.', 400, ErrorCodes.VALIDATION_ERROR);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.total * 100),
      currency: 'inr',
      metadata: {
        invoiceId: invoice._id.toString(),
        patientId: invoice.patientId.toString(),
      },
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a Razorpay Order for an invoice
 */
async function createRazorpayOrder(req, res, next) {
  try {
    const razorpay = await getRazorpay();
    if (!razorpay) throw new AppError('Razorpay is not configured. Please try Stripe or contact support.', 503, ErrorCodes.SERVICE_UNAVAILABLE);

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new AppError('Invoice not found.', 404, ErrorCodes.NOT_FOUND);
    if (invoice.status === 'PAID') throw new AppError('This invoice has already been paid.', 400, ErrorCodes.VALIDATION_ERROR);

    const options = {
      amount: Math.round(invoice.total * 100), // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `invoice_${invoice._id.toString().slice(-8)}`,
      notes: {
        invoiceId: invoice._id.toString(),
        patientId: invoice.patientId.toString(),
      },
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        invoiceId: invoice._id.toString(),
        patientName: invoice.patientId?.firstName ? `${invoice.patientId.firstName} ${invoice.patientId.lastName}` : '',
        patientEmail: invoice.patientId?.email || '',
        patientPhone: invoice.patientId?.phone || '',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify Razorpay Payment Signature
 */
async function verifyRazorpayPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new AppError('Invoice not found.', 404, ErrorCodes.NOT_FOUND);
    if (invoice.status === 'PAID') throw new AppError('This invoice has already been paid.', 400, ErrorCodes.VALIDATION_ERROR);

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new AppError('Invalid payment signature. Payment verification failed.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Record payment and mark invoice as paid
    const session = await mongoose.startSession();
    let newPayment;
    try {
      await session.withTransaction(async () => {
        [newPayment] = await Payment.create([{
          invoiceId: invoice._id,
          amount: invoice.total,
          method: 'RAZORPAY',
          gateway: 'razorpay',
          transactionId: razorpay_payment_id,
          status: 'COMPLETED',
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          razorpaySignature: razorpay_signature,
        }], { session });

        await Invoice.findByIdAndUpdate(invoice._id, { status: 'PAID', paidAt: new Date() }, { session });
      });
    } finally {
      await session.endSession();
    }

    logger.info('Razorpay payment verified', { invoiceId: invoice._id, paymentId: razorpay_payment_id });
    res.json({ success: true, message: 'Payment verified successfully.', data: newPayment });
  } catch (error) {
    next(error);
  }
}

/**
 * Razorpay Webhook handler
 */
async function razorpayWebhook(req, res, next) {
  try {
    let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      try {
        const Settings = require('../models/Settings');
        const settings = await Settings.findOne();
        webhookSecret = settings?.razorpayWebhookSecret || '';
      } catch (_) { /* ignore */ }
    }
    if (!webhookSecret) return res.status(503).json({ error: 'Razorpay webhook not configured' });

    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.error('Razorpay webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body.event;

    if (event === 'payment.captured') {
      const payment = req.body.payload.payment.entity;
      const invoiceId = payment.notes?.invoiceId;

      if (invoiceId) {
        const invoice = await Invoice.findById(invoiceId);
        if (invoice && invoice.status !== 'PAID') {
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              await Payment.create([{
                invoiceId: invoice._id,
                amount: payment.amount / 100,
                method: 'RAZORPAY',
                gateway: 'razorpay',
                transactionId: payment.id,
                status: 'COMPLETED',
                razorpayPaymentId: payment.id,
                razorpayOrderId: payment.order_id,
              }], { session });
              await Invoice.findByIdAndUpdate(invoice._id, { status: 'PAID', paidAt: new Date() }, { session });
            });
          } finally {
            await session.endSession();
          }
          logger.info('Razorpay webhook: payment captured', { invoiceId, paymentId: payment.id });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}

/**
 * Process payment (manual recording fallback)
 */
async function processPayment(req, res, next) {
  try {
    const { amount, method, transactionId, paymentIntentId, gateway } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) throw new AppError('Invoice not found.', 404, ErrorCodes.NOT_FOUND);
    if (invoice.status === 'PAID') throw new AppError('This invoice has already been paid.', 400, ErrorCodes.VALIDATION_ERROR);

    // If Stripe paymentIntentId provided, verify it on Stripe side
    if (paymentIntentId) {
      const stripe = await getStripe();
      if (stripe) {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== 'succeeded') {
          throw new AppError('Payment has not been confirmed yet.', 400, ErrorCodes.VALIDATION_ERROR);
        }
      }
    }

    const session = await mongoose.startSession();
    let newPayment;
    try {
      await session.withTransaction(async () => {
        [newPayment] = await Payment.create([{
          invoiceId: invoice._id,
          amount,
          method: method || 'MANUAL',
          gateway: gateway || 'manual',
          transactionId,
          status: 'COMPLETED',
        }], { session });
        await Invoice.findByIdAndUpdate(invoice._id, { status: 'PAID', paidAt: new Date() }, { session });
      });
    } finally {
      await session.endSession();
    }

    logger.info('Payment processed', { invoiceId: invoice._id, amount, method });
    res.json({ success: true, message: 'Payment processed successfully.', data: newPayment });
  } catch (error) {
    next(error);
  }
}

/**
 * Stripe Webhook handler
 */
async function stripeWebhook(req, res, next) {
  try {
    const stripe = await getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const sig = req.headers['stripe-signature'];
    // Use env var first, fallback to DB settings
    let endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      try {
        const Settings = require('../models/Settings');
        const settings = await Settings.findOne();
        endpointSecret = settings?.stripeWebhookSecret || '';
      } catch (_) { /* ignore */ }
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', { error: err.message });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const invoiceId = paymentIntent.metadata?.invoiceId;

      if (invoiceId) {
        const invoice = await Invoice.findById(invoiceId);
        if (invoice && invoice.status !== 'PAID') {
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              await Payment.create([{
                invoiceId: invoice._id,
                amount: paymentIntent.amount / 100,
                method: 'STRIPE',
                gateway: 'stripe',
                transactionId: paymentIntent.id,
                status: 'COMPLETED',
              }], { session });
              await Invoice.findByIdAndUpdate(invoice._id, { status: 'PAID', paidAt: new Date() }, { session });
            });
          } finally {
            await session.endSession();
          }
          logger.info('Stripe webhook: payment completed', { invoiceId, paymentIntentId: paymentIntent.id });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}

async function getPaymentHistory(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (req.user.role === 'PATIENT') {
      const invoices = await Invoice.find({ patientId: req.user.id }).select('_id');
      where.invoiceId = { $in: invoices.map((i) => i._id) };
    }

    const [payments, total] = await Promise.all([
      Payment.find(where)
        .populate({ path: 'invoiceId', populate: { path: 'patientId', select: 'firstName lastName' } })
        .skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      Payment.countDocuments(where),
    ]);

    res.json({
      success: true,
      data: { payments, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Download Invoice PDF
 */
async function downloadInvoicePDF(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({ path: 'patientId', select: 'firstName lastName email phone' })
      .populate({ path: 'appointmentId', populate: { path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } } })
      .populate('payments');

    if (!invoice) throw new AppError('Invoice not found.', 404, ErrorCodes.NOT_FOUND);

    const pdfBuffer = await generateInvoicePDF(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice._id.toString().slice(-8)}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

/**
 * Download Receipt PDF
 */
async function downloadReceiptPDF(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({ path: 'invoiceId', populate: [{ path: 'patientId', select: 'firstName lastName email' }] });

    if (!payment) throw new AppError('Payment not found.', 404, ErrorCodes.NOT_FOUND);

    const pdfBuffer = await generateReceiptPDF(payment);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${payment._id.toString().slice(-8)}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getInvoices,
  getDoctorInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  processPayment,
  getPaymentHistory,
  createPaymentIntent,
  createRazorpayOrder,
  verifyRazorpayPayment,
  razorpayWebhook,
  stripeWebhook,
  downloadInvoicePDF,
  downloadReceiptPDF,
};
