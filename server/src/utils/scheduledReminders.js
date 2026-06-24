const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const {
  notifyAppointmentReminder,
  notifyConsultationReminder,
  notifyFollowupReminder,
  notifyPaymentReminder,
} = require('../utils/notificationService');
const logger = require('../utils/logger');

/**
 * Scheduled reminder system
 * Runs appointment reminders (24h + 1h before), follow-up reminders, and payment reminders
 */

// Run every hour at minute 0
const REMINDER_CRON = '0 * * * *';

async function sendAppointmentReminders() {
  try {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Find appointments in the next 24 hours (for 24h reminder)
    const appointments24h = await Appointment.find({
      date: {
        $gte: new Date(twentyFourHoursFromNow.setHours(0, 0, 0, 0)),
        $lt: new Date(twentyFourHoursFromNow.setHours(23, 59, 59, 999)),
      },
      status: { $in: ['confirmed', 'approved'] },
      reminderSent24h: { $ne: true },
    })
      .populate('patientId')
      .populate('doctorId.userId')
      .populate('serviceId');

    for (const appointment of appointments24h) {
      try {
        await notifyAppointmentReminder(appointment);
        appointment.reminderSent24h = true;
        await appointment.save();
        logger.info('24h reminder sent', { appointmentId: appointment._id });
      } catch (err) {
        logger.error('Failed to send 24h reminder', { appointmentId: appointment._id, error: err.message });
      }
    }

    // Find appointments in the next 1 hour (for 1h reminder)
    const appointments1h = await Appointment.find({
      date: {
        $gte: now,
        $lt: oneHourFromNow,
      },
      status: { $in: ['confirmed', 'approved'] },
      reminderSent1h: { $ne: true },
    })
      .populate('patientId')
      .populate('doctorId.userId')
      .populate('serviceId');

    for (const appointment of appointments1h) {
      try {
        // Send consultation reminder for video appointments
        if (appointment.consultationType === 'VIDEO') {
          await notifyConsultationReminder(appointment);
        } else {
          await notifyAppointmentReminder(appointment);
        }
        appointment.reminderSent1h = true;
        await appointment.save();
        logger.info('1h reminder sent', { appointmentId: appointment._id });
      } catch (err) {
        logger.error('Failed to send 1h reminder', { appointmentId: appointment._id, error: err.message });
      }
    }

    // Find follow-up appointments (appointments with isFollowUp flag)
    const followupAppointments = await Appointment.find({
      date: {
        $gte: new Date(twentyFourHoursFromNow.setHours(0, 0, 0, 0)),
        $lt: new Date(twentyFourHoursFromNow.setHours(23, 59, 59, 999)),
      },
      status: { $in: ['confirmed', 'approved'] },
      isFollowUp: true,
      reminderSent24h: { $ne: true },
    })
      .populate('patientId')
      .populate('doctorId.userId')
      .populate('serviceId');

    for (const appointment of followupAppointments) {
      try {
        await notifyFollowupReminder(appointment);
        logger.info('Follow-up reminder sent', { appointmentId: appointment._id });
      } catch (err) {
        logger.error('Failed to send follow-up reminder', { appointmentId: appointment._id, error: err.message });
      }
    }
  } catch (error) {
    logger.error('Appointment reminder cron failed', { error: error.message });
  }
}

// Run payment reminders daily at 9 AM
const PAYMENT_REMINDER_CRON = '0 9 * * *';

async function sendPaymentReminders() {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find overdue invoices (past due date, not paid)
    const overdueInvoices = await Invoice.find({
      status: { $in: ['PENDING', 'OVERDUE'] },
      dueDate: { $lt: now },
      reminderSent: { $ne: true },
    })
      .populate('patientId')
      .limit(50);

    for (const invoice of overdueInvoices) {
      try {
        await notifyPaymentReminder(invoice);
        invoice.reminderSent = true;
        await invoice.save();
        logger.info('Payment reminder sent', { invoiceId: invoice._id });
      } catch (err) {
        logger.error('Failed to send payment reminder', { invoiceId: invoice._id, error: err.message });
      }
    }

    // Find invoices due in 3 days
    const upcomingInvoices = await Invoice.find({
      status: 'PENDING',
      dueDate: {
        $gte: now,
        $lte: threeDaysFromNow,
      },
      reminderSent3Days: { $ne: true },
    })
      .populate('patientId')
      .limit(50);

    for (const invoice of upcomingInvoices) {
      try {
        await notifyPaymentReminder(invoice);
        invoice.reminderSent3Days = true;
        await invoice.save();
        logger.info('3-day payment reminder sent', { invoiceId: invoice._id });
      } catch (err) {
        logger.error('Failed to send 3-day payment reminder', { invoiceId: invoice._id, error: err.message });
      }
    }
  } catch (error) {
    logger.error('Payment reminder cron failed', { error: error.message });
  }
}

function startScheduledReminders() {
  // Appointment reminders: every hour
  cron.schedule(REMINDER_CRON, () => {
    logger.info('Running appointment reminder cron job');
    sendAppointmentReminders();
  });

  // Payment reminders: daily at 9 AM
  cron.schedule(PAYMENT_REMINDER_CRON, () => {
    logger.info('Running payment reminder cron job');
    sendPaymentReminders();
  });

  logger.info('Scheduled reminders initialized', {
    appointmentCron: REMINDER_CRON,
    paymentCron: PAYMENT_REMINDER_CRON,
  });
}

module.exports = { startScheduledReminders, sendAppointmentReminders, sendPaymentReminders };
