const { Notification } = require('../models');
const { sendTemplateEmail } = require('./emailService');
const logger = require('./logger');
const { emitToUser } = require('../config/socket');

/**
 * Create an in-app notification for a user
 */
async function createNotification({ userId, type, title, message }) {
  try {
    const notification = await Notification.create({ userId, type, title, message });
    // Emit real-time notification via Socket.io
    emitToUser(userId, 'notification:new', notification);
    return notification;
  } catch (error) {
    logger.error('Failed to create notification', { userId, type, error: error.message });
  }
}

/**
 * Send email notification (fire-and-forget, logs errors)
 */
async function sendEmailNotification(to, templateName, data) {
  try {
    await sendTemplateEmail(to, templateName, data);
  } catch (error) {
    logger.error('Failed to send email notification', { to, templateName, error: error.message });
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

module.exports = {
  createNotification,
  sendEmailNotification,
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  notifyPrescriptionIssued,
  notifyBillingReminder,
  notifyMedicalRecordCreated,
  notifyTelehealthReminder,
};
