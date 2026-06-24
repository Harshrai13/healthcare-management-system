const mongoose = require('mongoose');
const { Appointment, DoctorProfile, AppointmentWaitlist, Consultation } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');
const logger = require('../utils/logger');
const { notifyAppointmentConfirmed, notifyAppointmentCancelled, notifyAppointmentRescheduled, notifyTelehealthReminder, notifyAppointmentApproved, notifyAppointmentRejected, createNotification } = require('../utils/notificationService');

async function createAppointment(req, res, next) {
  try {
    const { doctorId, serviceId, date, startTime, consultationType, notes } = req.body;
    const patientId = req.user.id;
    const appointmentDate = new Date(date);
    if (appointmentDate < new Date().setHours(0, 0, 0, 0)) throw new AppError('Cannot book appointments in the past.', 400, ErrorCodes.VALIDATION_ERROR);

    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor || !doctor.isAvailable) throw new AppError('Selected doctor is not available.', 404, ErrorCodes.NOT_FOUND);
    if (consultationType === 'VIDEO' && !doctor.consultationModes?.includes('VIDEO')) throw new AppError('This doctor does not offer video consultations.', 400, ErrorCodes.VALIDATION_ERROR);

    const existing = await Appointment.findOne({ doctorId, date: appointmentDate, startTime, status: { $nin: ['CANCELLED', 'NO_SHOW'] } });
    if (existing) throw new AppError('This time slot is already booked. Please select another time.', 409, ErrorCodes.APPOINTMENT_CONFLICT);

    const session = await mongoose.startSession();
    let appointment, consultation;
    try {
      await session.withTransaction(async () => {
        const doubleCheck = await Appointment.findOne({ doctorId, date: appointmentDate, startTime, status: { $nin: ['CANCELLED', 'NO_SHOW'] } }).session(session);
        if (doubleCheck) throw new AppError('This time slot was just booked. Please select another time.', 409, ErrorCodes.APPOINTMENT_CONFLICT);
        [appointment] = await Appointment.create([{ patientId, doctorId, serviceId, date: appointmentDate, startTime, consultationType, notes, status: 'PENDING' }], { session });

        // Auto-create Consultation record for VIDEO appointments
        if (consultationType === 'VIDEO') {
          const roomName = `verdantcare-${appointment._id}`;
          [consultation] = await Consultation.create([{
            appointmentId: appointment._id,
            doctorId,
            patientId,
            roomUrl: roomName,
            status: 'WAITING',
          }], { session });
        }
      });
    } finally { await session.endSession(); }

    const populatePaths = [
      { path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } },
      { path: 'serviceId', select: 'name' },
    ];
    await appointment.populate(populatePaths);

    // Include consultationId in response for VIDEO appointments
    const responseData = appointment.toObject();
    if (consultation) {
      responseData.consultationId = consultation._id;
    }

    logger.info('Appointment created', { appointmentId: appointment._id, patientId, doctorId, date, startTime });
    // Truly fire-and-forget: defer to next tick so response is sent immediately
    setImmediate(() => {
      notifyAppointmentConfirmed(appointment).catch((err) => logger.error('Notification error', { err: err.message }));
    });
    res.status(201).json({ success: true, message: 'Appointment booked successfully.', data: responseData });
  } catch (error) { next(error); }
}

async function getAppointments(req, res, next) {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (req.user.role === 'PATIENT') where.patientId = req.user.id;
    else if (req.user.role === 'DOCTOR') {
      const dp = await DoctorProfile.findOne({ userId: req.user.id }).select('_id');
      where.doctorId = dp?._id;
    }
    if (status) where.status = status;
    if (type) where.consultationType = type;

    const [appointments, total] = await Promise.all([
      Appointment.find(where)
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName avatar' } })
        .populate({ path: 'patientId', select: 'firstName lastName email' })
        .populate({ path: 'serviceId', select: 'name' })
        .skip(skip).limit(parseInt(limit)).sort({ date: -1 }),
      Appointment.countDocuments(where),
    ]);
    res.json({ success: true, data: { appointments, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) { next(error); }
}

async function getAppointmentById(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName email avatar' } })
      .populate({ path: 'patientId', select: 'firstName lastName email phone' }).populate('serviceId');
    if (!appointment) throw new AppError('Appointment not found.', 404, ErrorCodes.NOT_FOUND);
    if (req.user.role === 'PATIENT' && appointment.patientId._id.toString() !== req.user.id) throw new AppError('You do not have access to this appointment.', 403, ErrorCodes.FORBIDDEN);
    res.json({ success: true, data: appointment });
  } catch (error) { next(error); }
}

async function updateAppointment(req, res, next) {
  try {
    const { status, notes } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status, notes }, { new: true })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .populate({ path: 'patientId', select: 'firstName lastName email' })
      .populate({ path: 'serviceId', select: 'name' });
    logger.info('Appointment updated', { appointmentId: appointment._id, status });
    // Fire-and-forget: if status changed to CONFIRMED, send confirmation
    if (status === 'CONFIRMED') {
      setImmediate(() => {
        notifyAppointmentConfirmed(appointment).catch((err) => logger.error('Notification error', { err: err.message }));
        if (appointment.consultationType === 'VIDEO') {
          notifyTelehealthReminder(appointment).catch((err) => logger.error('Telehealth reminder error', { err: err.message }));
        }
      });
    }
    if (status === 'APPROVED') {
      setImmediate(() => {
        notifyAppointmentApproved(appointment).catch((err) => logger.error('Notification error', { err: err.message }));
      });
    }
    if (status === 'REJECTED') {
      setImmediate(() => {
        notifyAppointmentRejected(appointment, notes).catch((err) => logger.error('Notification error', { err: err.message }));
      });
    }
    if (status === 'COMPLETED') {
      setImmediate(() => {
        createNotification({
          userId: appointment.patientId._id,
          type: 'REVIEW_REQUEST',
          title: 'How was your visit?',
          message: `Your appointment with Dr. ${appointment.doctorId.userId?.lastName || 'Doctor'} is complete. We'd love to hear your feedback.`,
        }).catch((err) => logger.error('Notification error', { err: err.message }));
      });
    }
    res.json({ success: true, message: 'Appointment updated successfully.', data: appointment });
  } catch (error) { next(error); }
}

async function cancelAppointment(req, res, next) {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findById(req.params.id)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .populate({ path: 'patientId', select: 'firstName lastName email' })
      .populate({ path: 'serviceId', select: 'name' });
    if (!appointment) throw new AppError('Appointment not found.', 404, ErrorCodes.NOT_FOUND);
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) throw new AppError('Cannot cancel this appointment.', 400, ErrorCodes.VALIDATION_ERROR);
    const updated = await Appointment.findByIdAndUpdate(req.params.id, { status: 'CANCELLED', cancellationReason: reason }, { new: true });
    logger.info('Appointment cancelled', { appointmentId: appointment._id, reason });
    // Truly fire-and-forget: defer to next tick
    setImmediate(() => {
      notifyAppointmentCancelled(appointment, reason).catch((err) => logger.error('Notification error', { err: err.message }));
    });
    res.json({ success: true, message: 'Appointment cancelled successfully.', data: updated });
  } catch (error) { next(error); }
}

async function rescheduleAppointment(req, res, next) {
  try {
    const { date, startTime } = req.body;
    const current = await Appointment.findById(req.params.id);
    if (!current) throw new AppError('Appointment not found.', 404, ErrorCodes.NOT_FOUND);
    const existing = await Appointment.findOne({ doctorId: current.doctorId, date: new Date(date), startTime, status: { $nin: ['CANCELLED', 'NO_SHOW'] }, _id: { $ne: req.params.id } });
    if (existing) throw new AppError('This time slot is already booked.', 409, ErrorCodes.APPOINTMENT_CONFLICT);
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { date: new Date(date), startTime, status: 'RESCHEDULED' }, { new: true })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .populate({ path: 'patientId', select: 'firstName lastName email' })
      .populate({ path: 'serviceId', select: 'name' });
    logger.info('Appointment rescheduled', { appointmentId: req.params.id, newDate: date, newTime: startTime });
    // Truly fire-and-forget: defer to next tick
    setImmediate(() => {
      notifyAppointmentRescheduled(appointment).catch((err) => logger.error('Notification error', { err: err.message }));
    });
    res.json({ success: true, message: 'Appointment rescheduled successfully.', data: appointment });
  } catch (error) { next(error); }
}

async function addToWaitlist(req, res, next) {
  try {
    const { doctorId, serviceId, preferredDates } = req.body;
    const waitlist = await AppointmentWaitlist.create({ patientId: req.user.id, doctorId, serviceId, preferredDates: preferredDates.map((d) => new Date(d)) });
    res.status(201).json({ success: true, message: 'Added to waitlist. You will be notified when a slot opens.', data: waitlist });
  } catch (error) { next(error); }
}

module.exports = { createAppointment, getAppointments, getAppointmentById, updateAppointment, cancelAppointment, rescheduleAppointment, addToWaitlist };
