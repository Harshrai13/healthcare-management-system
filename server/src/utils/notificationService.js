const { Notification } = require('../models');
const { sendTemplateEmail } = require('./emailService');
const logger = require('./logger');

/**
 * Create an in-app notification for a user
 */
async function createNotification({ userId, type, title, message }) {
  try {
    const notification = await Notification.create({ userId, type, title, message });
    // Emit real-time notification via Socket.io (lazy require to avoid circular dependency)
    const { emitToUser } = require('../config/socket');
    emitToUser(userId, 'notification:new', notification);
    return notification;
  } catch (error) {
    logger.error('Failed to create notification', { userId, type, error: error.message });
  }
}

/**
 * Send email notification (fire-and-forget, logs errors)
 * Returns { emailSent: boolean } so callers can react
 */
async function sendEmailNotification(to, templateName, data) {
  try {
    const result = await sendTemplateEmail(to, templateName, data);
    return result;
  } catch (error) {
    logger.error('Failed to send email notification', { to, templateName, error: error.message });
    return { emailSent: false, error: error.message };
  }
}

/**
 * Send SMS notification (fire-and-forget, logs errors)
 */
async function sendSMSNotification(to, body, options = {}) {
  try {
    const { sendSMS } = require('../config/twilio');
    await sendSMS(to, body, options);
    return { smsSent: true };
  } catch (error) {
    logger.error('Failed to send SMS notification', { to, error: error.message });
    return { smsSent: false, error: error.message };
  }
}

/**
 * Appointment confirmed notification + email
 */
async function notifyAppointmentConfirmed(appointment) {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;
  const service = appointment.serviceId;
  const isVideo = appointment.consultationType === 'VIDEO';

  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'APPOINTMENT_CONFIRMED',
    title: 'Appointment Confirmed',
    message: `Your ${isVideo ? 'video ' : ''}appointment with Dr. ${doctor.userId?.lastName || 'Doctor'} on ${dateStr} at ${appointment.startTime} has been confirmed.`,
  });

  await sendEmailNotification(patient.email, 'appointmentConfirmation', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: `Dr. ${doctor.userId?.lastName || 'Doctor'}`,
    service: service?.name || 'Medical Service',
    date: dateStr,
    time: appointment.startTime,
    type: isVideo ? 'Video Consultation' : 'In-Person Visit',
  });
}

/**
 * Appointment cancelled notification + email
 */
async function notifyAppointmentCancelled(appointment, reason) {
  const patient = appointment.patientId;
  const service = appointment.serviceId;

  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'APPOINTMENT_CANCELLED',
    title: 'Appointment Cancelled',
    message: `Your appointment on ${dateStr} at ${appointment.startTime} has been cancelled. ${reason || ''}`,
  });

  await sendEmailNotification(patient.email, 'appointmentCancellation', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    service: service?.name || 'Medical Service',
    date: dateStr,
    time: appointment.startTime,
  });
}

/**
 * Prescription issued notification + email
 */
async function notifyPrescriptionIssued(prescription) {
  const patient = prescription.patientId;
  const doctor = prescription.doctorId;

  await createNotification({
    userId: patient._id,
    type: 'PRESCRIPTION_ISSUED',
    title: 'New Prescription Issued',
    message: `Dr. ${doctor.userId?.lastName || 'Doctor'} has issued a new prescription for you.`,
  });

  await sendEmailNotification(patient.email, 'prescriptionIssued', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: doctor.userId?.lastName || 'Doctor',
  });
}

/**
 * Billing reminder notification + email
 */
async function notifyBillingReminder(invoice) {
  const patient = invoice.patientId;

  await createNotification({
    userId: patient._id,
    type: 'BILLING_REMINDER',
    title: 'Invoice Ready',
    message: `A new invoice for $${invoice.total} is ready for payment. Due date: ${new Date(invoice.dueDate).toLocaleDateString()}`,
  });

  await sendEmailNotification(patient.email, 'invoiceReady', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    invoiceId: invoice._id.toString().slice(-8).toUpperCase(),
    total: invoice.total,
    dueDate: new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  });
}

/**
 * Medical record created notification
 */
async function notifyMedicalRecordCreated(record) {
  const patient = record.patientId;
  const doctor = record.doctorId;

  await createNotification({
    userId: patient._id,
    type: 'GENERAL_ANNOUNCEMENT',
    title: 'Medical Record Updated',
    message: `Dr. ${doctor.userId?.lastName || 'Doctor'} has added a new medical record to your file.`,
  });

  await sendEmailNotification(patient.email, 'medicalRecordCreated', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: `Dr. ${doctor.userId?.lastName || 'Doctor'}`,
    clientUrl: process.env.CLIENT_URL,
  });
}

/**
 * Appointment rescheduled notification + email
 */
async function notifyAppointmentRescheduled(appointment) {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;
  const service = appointment.serviceId;

  const newDateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'APPOINTMENT_CONFIRMED',
    title: 'Appointment Rescheduled',
    message: `Your appointment has been rescheduled to ${newDateStr} at ${appointment.startTime}.`,
  });

  await sendEmailNotification(patient.email, 'appointmentRescheduled', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: `Dr. ${doctor.userId?.lastName || 'Doctor'}`,
    service: service?.name || 'Medical Service',
    newDate: newDateStr,
    newTime: appointment.startTime,
  });
}

/**
 * Telehealth reminder notification + email (sent before video appointment)
 */
async function notifyTelehealthReminder(appointment) {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;
  const service = appointment.serviceId;

  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'TELEHEALTH_REMINDER',
    title: 'Video Consultation Reminder',
    message: `Your video consultation with Dr. ${doctor.userId?.lastName || 'Doctor'} is at ${dateStr} ${appointment.startTime}. Join from your dashboard.`,
  });

  await sendEmailNotification(patient.email, 'telehealthReminder', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: `Dr. ${doctor.userId?.lastName || 'Doctor'}`,
    service: service?.name || 'Medical Service',
    date: dateStr,
    time: appointment.startTime,
  });
}

/**
 * Appointment approved notification + email
 */
async function notifyAppointmentApproved(appointment) {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;
  const service = appointment.serviceId;

  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'APPOINTMENT_APPROVED',
    title: 'Appointment Approved',
    message: `Your appointment request with Dr. ${doctor.userId?.lastName || 'Doctor'} on ${dateStr} at ${appointment.startTime} has been approved.`,
  });

  await sendEmailNotification(patient.email, 'appointmentApproved', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: `Dr. ${doctor.userId?.lastName || 'Doctor'}`,
    service: service?.name || 'Medical Service',
    date: dateStr,
    time: appointment.startTime,
  });
}

/**
 * Appointment rejected notification + email
 */
async function notifyAppointmentRejected(appointment, reason) {
  const patient = appointment.patientId;
  const service = appointment.serviceId;

  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'APPOINTMENT_REJECTED',
    title: 'Appointment Request Rejected',
    message: `Your appointment request on ${dateStr} at ${appointment.startTime} has been rejected. ${reason || ''}`,
  });

  await sendEmailNotification(patient.email, 'appointmentRejected', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    service: service?.name || 'Medical Service',
    date: dateStr,
    reason: reason || '',
    clientUrl: process.env.CLIENT_URL,
  });
}

/**
 * Appointment reminder notification + email + SMS
 */
async function notifyAppointmentReminder(appointment) {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;
  const service = appointment.serviceId;

  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'APPOINTMENT_REMINDER',
    title: 'Appointment Reminder',
    message: `Reminder: Your appointment with Dr. ${doctor.userId?.lastName || 'Doctor'} is ${dateStr} at ${appointment.startTime}.`,
  });

  await sendEmailNotification(patient.email, 'appointmentReminder', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: `Dr. ${doctor.userId?.lastName || 'Doctor'}`,
    service: service?.name || 'Medical Service',
    date: dateStr,
    time: appointment.startTime,
  });

  // Send SMS reminder
  if (patient.phone) {
    await sendSMSNotification(patient.phone, `Reminder: You have an appointment with Dr. ${doctor.userId?.lastName || 'Doctor'} on ${dateStr} at ${appointment.startTime}. - VerdantCare`, {
      recipientType: 'patient',
      recipientId: patient._id,
    });
  }
}

/**
 * Consultation reminder notification + email
 */
async function notifyConsultationReminder(appointment) {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;
  const service = appointment.serviceId;

  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'CONSULTATION_REMINDER',
    title: 'Consultation Starting Soon',
    message: `Your consultation with Dr. ${doctor.userId?.lastName || 'Doctor'} is starting soon at ${dateStr} ${appointment.startTime}.`,
  });

  await sendEmailNotification(patient.email, 'consultationReminder', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: `Dr. ${doctor.userId?.lastName || 'Doctor'}`,
    date: dateStr,
    time: appointment.startTime,
    clientUrl: process.env.CLIENT_URL,
  });
}

/**
 * Consultation complete notification + email
 */
async function notifyConsultationComplete(appointment) {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;

  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'CONSULTATION_COMPLETE',
    title: 'Consultation Completed',
    message: `Your consultation with Dr. ${doctor.userId?.lastName || 'Doctor'} on ${dateStr} has been completed. A summary is available in your portal.`,
  });

  await sendEmailNotification(patient.email, 'consultationComplete', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: `Dr. ${doctor.userId?.lastName || 'Doctor'}`,
    date: dateStr,
    clientUrl: process.env.CLIENT_URL,
  });
}

/**
 * Prescription updated notification + email
 */
async function notifyPrescriptionUpdated(prescription) {
  const patient = prescription.patientId;
  const doctor = prescription.doctorId;

  await createNotification({
    userId: patient._id,
    type: 'PRESCRIPTION_UPDATED',
    title: 'Prescription Updated',
    message: `Dr. ${doctor.userId?.lastName || 'Doctor'} has updated your prescription.`,
  });

  await sendEmailNotification(patient.email, 'prescriptionUpdated', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: doctor.userId?.lastName || 'Doctor',
    clientUrl: process.env.CLIENT_URL,
  });
}

/**
 * Invoice generated notification + email
 */
async function notifyInvoiceGenerated(invoice) {
  const patient = invoice.patientId;

  await createNotification({
    userId: patient._id,
    type: 'INVOICE_GENERATED',
    title: 'Invoice Generated',
    message: `A new invoice for $${invoice.total} has been generated. Due date: ${new Date(invoice.dueDate).toLocaleDateString()}`,
  });

  await sendEmailNotification(patient.email, 'invoiceGenerated', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    invoiceId: invoice._id.toString().slice(-8).toUpperCase(),
    total: invoice.total,
    dueDate: new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    clientUrl: process.env.CLIENT_URL,
  });
}

/**
 * Payment success notification + email
 */
async function notifyPaymentSuccess(payment) {
  const patient = payment.patientId;

  await createNotification({
    userId: patient._id,
    type: 'PAYMENT_SUCCESS',
    title: 'Payment Successful',
    message: `Your payment of $${payment.amount} has been processed successfully.`,
  });

  await sendEmailNotification(patient.email, 'paymentSuccess', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    amount: payment.amount,
    invoiceId: payment.invoiceId?.toString().slice(-8).toUpperCase() || 'N/A',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  });
}

/**
 * Payment failed notification + email
 */
async function notifyPaymentFailed(payment, error) {
  const patient = payment.patientId;

  await createNotification({
    userId: patient._id,
    type: 'PAYMENT_FAILED',
    title: 'Payment Failed',
    message: `Your payment attempt failed. Please try again.`,
  });

  await sendEmailNotification(patient.email, 'paymentFailed', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    invoiceId: payment.invoiceId?.toString().slice(-8).toUpperCase() || 'N/A',
    amount: payment.amount,
    error: error || 'Unknown error',
    clientUrl: process.env.CLIENT_URL,
  });
}

/**
 * Payment reminder notification + email + SMS
 */
async function notifyPaymentReminder(invoice) {
  const patient = invoice.patientId;

  await createNotification({
    userId: patient._id,
    type: 'PAYMENT_REMINDER',
    title: 'Payment Reminder',
    message: `Reminder: You have an outstanding invoice of $${invoice.total}. Due date: ${new Date(invoice.dueDate).toLocaleDateString()}`,
  });

  await sendEmailNotification(patient.email, 'paymentReminder', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    invoiceId: invoice._id.toString().slice(-8).toUpperCase(),
    total: invoice.total,
    dueDate: new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    clientUrl: process.env.CLIENT_URL,
  });

  // Send SMS reminder
  if (patient.phone) {
    await sendSMSNotification(patient.phone, `Payment Reminder: You have an outstanding invoice of $${invoice.total}. Due: ${new Date(invoice.dueDate).toLocaleDateString()}. - VerdantCare`, {
      recipientType: 'patient',
      recipientId: patient._id,
    });
  }
}

/**
 * Receipt generated notification + email
 */
async function notifyReceiptGenerated(payment) {
  const patient = payment.patientId;

  await createNotification({
    userId: patient._id,
    type: 'RECEIPT_GENERATED',
    title: 'Receipt Generated',
    message: `A receipt for your payment of $${payment.amount} has been generated.`,
  });

  await sendEmailNotification(patient.email, 'receiptGenerated', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    invoiceId: payment.invoiceId?.toString().slice(-8).toUpperCase() || 'N/A',
    amount: payment.amount,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    method: payment.method || 'Online',
    clientUrl: process.env.CLIENT_URL,
  });
}

/**
 * Follow-up scheduled notification + email
 */
async function notifyFollowupScheduled(appointment) {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;

  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'FOLLOWUP_SCHEDULED',
    title: 'Follow-up Scheduled',
    message: `A follow-up appointment has been scheduled with Dr. ${doctor.userId?.lastName || 'Doctor'} on ${dateStr} at ${appointment.startTime}.`,
  });

  await sendEmailNotification(patient.email, 'followupScheduled', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: `Dr. ${doctor.userId?.lastName || 'Doctor'}`,
    date: dateStr,
    time: appointment.startTime,
  });
}

/**
 * Follow-up reminder notification + email + SMS
 */
async function notifyFollowupReminder(appointment) {
  const patient = appointment.patientId;
  const doctor = appointment.doctorId;

  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await createNotification({
    userId: patient._id,
    type: 'FOLLOWUP_REMINDER',
    title: 'Follow-up Reminder',
    message: `Reminder: Your follow-up with Dr. ${doctor.userId?.lastName || 'Doctor'} is on ${dateStr} at ${appointment.startTime}.`,
  });

  await sendEmailNotification(patient.email, 'followupReminder', {
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorName: `Dr. ${doctor.userId?.lastName || 'Doctor'}`,
    date: dateStr,
    time: appointment.startTime,
  });

  // Send SMS reminder
  if (patient.phone) {
    await sendSMSNotification(patient.phone, `Follow-up Reminder: You have a follow-up with Dr. ${doctor.userId?.lastName || 'Doctor'} on ${dateStr} at ${appointment.startTime}. - VerdantCare`, {
      recipientType: 'patient',
      recipientId: patient._id,
    });
  }
}

/**
 * Clinic announcement notification + email + SMS
 */
async function notifyClinicAnnouncement(announcement, users) {
  for (const user of users) {
    await createNotification({
      userId: user._id,
      type: 'CLINIC_ANNOUNCEMENT',
      title: announcement.title,
      message: announcement.body,
    });

    if (announcement.deliveryMethods?.includes('email') && user.email) {
      await sendEmailNotification(user.email, 'clinicAnnouncement', {
        patientName: `${user.firstName} ${user.lastName}`,
        announcementTitle: announcement.title,
        announcementBody: announcement.body,
      });
    }

    if (announcement.deliveryMethods?.includes('sms') && user.phone) {
      await sendSMSNotification(user.phone, `${announcement.title}: ${announcement.body} - VerdantCare`, {
        recipientType: user.role || 'patient',
        recipientId: user._id,
      });
    }
  }
}

/**
 * Consultation started notification — sent when doctor starts the consultation.
 * Includes "Join Now" action for the patient.
 */
async function notifyConsultationStarted({ patientId, patientEmail, doctorName, consultationId, appointmentDate, appointmentTime }) {
  const dateStr = appointmentDate
    ? new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'today';

  await createNotification({
    userId: patientId,
    type: 'CONSULTATION_STARTED',
    title: 'Consultation Started — Join Now',
    message: `Dr. ${doctorName} has started your video consultation. Click to join now.`,
  });

  // Send email if configured
  try {
    const videoSettings = require('../models/VideoSettings');
    const settings = await videoSettings.getSettings();
    if (settings.emailNotifications && patientEmail) {
      await sendEmailNotification(patientEmail, 'consultationStarted', {
        patientName: '',
        doctorName: `Dr. ${doctorName}`,
        date: dateStr,
        time: appointmentTime || '',
        clientUrl: process.env.CLIENT_URL,
        consultationId,
      });
    }
  } catch (err) {
    logger.error('Failed to send consultation started email', { error: err.message });
  }
}

module.exports = {
  createNotification,
  sendEmailNotification,
  sendSMSNotification,
  notifyAppointmentConfirmed,
  notifyAppointmentApproved,
  notifyAppointmentRejected,
  notifyAppointmentReminder,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  notifyConsultationReminder,
  notifyConsultationComplete,
  notifyPrescriptionIssued,
  notifyPrescriptionUpdated,
  notifyBillingReminder,
  notifyInvoiceGenerated,
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifyPaymentReminder,
  notifyReceiptGenerated,
  notifyFollowupScheduled,
  notifyFollowupReminder,
  notifyClinicAnnouncement,
  notifyMedicalRecordCreated,
  notifyTelehealthReminder,
  notifyConsultationStarted,
};
