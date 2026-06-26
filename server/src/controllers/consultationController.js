const { Appointment, Consultation, VideoSettings } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');
const logger = require('../utils/logger');
const { notifyConsultationComplete, notifyConsultationStarted } = require('../utils/notificationService');
const { getActiveProvider } = require('../providers');

/**
 * POST /api/consultations/:appointmentId/start
 * Doctor starts a video consultation.
 * - Validates the appointment belongs to this doctor
 * - Creates/retrieves the consultation record
 * - Uses the active video provider to create a room
 * - Notifies the patient with a "Join Now" action
 */
async function startConsultation(req, res, next) {
  try {
    const { appointmentId } = req.params;
    const doctorUserId = req.user.id;

    // Fetch appointment with all required relations
    const appointment = await Appointment.findById(appointmentId)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .populate({ path: 'patientId', select: 'firstName lastName email' });

    if (!appointment) throw new AppError('Appointment not found.', 404, ErrorCodes.NOT_FOUND);
    if (appointment.consultationType !== 'VIDEO') {
      throw new AppError('This appointment is not a video consultation.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // SECURITY: Verify the logged-in doctor owns this appointment
    const doctorUserIdFromAppt = appointment.doctorId.userId?._id?.toString();
    if (doctorUserIdFromAppt !== doctorUserId) {
      throw new AppError('You are not authorized to start this consultation.', 403, ErrorCodes.FORBIDDEN);
    }

    // Check if video consultations are enabled
    const videoSettings = await VideoSettings.getSettings();
    if (!videoSettings.enabled) {
      throw new AppError('Video consultations are currently disabled.', 403, ErrorCodes.FORBIDDEN);
    }

    // Get the active video provider
    const provider = await getActiveProvider();

    // Find existing consultation or create one
    let consultation = await Consultation.findOne({ appointmentId });
    if (!consultation) {
      // Use provider to create a room
      const tempConsultation = { appointmentId, _id: appointmentId };
      const room = await provider.createRoom(tempConsultation, videoSettings);

      consultation = await Consultation.create({
        appointmentId,
        doctorId: appointment.doctorId._id,
        patientId: appointment.patientId._id,
        roomUrl: room.roomId,
        provider: provider.name,
        status: 'WAITING',
      });
    }

    // Update consultation status
    consultation.status = 'IN_PROGRESS';
    consultation.startedAt = consultation.startedAt || new Date();
    await consultation.save();

    const doctorName = `${appointment.doctorId.userId.firstName} ${appointment.doctorId.userId.lastName}`;

    // Notify patient via Socket.io — real-time "Join Now" notification
    const { emitToUser } = require('../config/socket');
    emitToUser(appointment.patientId._id.toString(), 'consultation:started', {
      consultationId: consultation._id,
      appointmentId: appointment._id,
      doctorName,
      roomName: consultation.roomUrl,
      provider: provider.name,
    });

    // Create in-app + email notification for patient
    setImmediate(() => {
      notifyConsultationStarted({
        patientId: appointment.patientId._id.toString(),
        patientEmail: appointment.patientId.email,
        doctorName: `${appointment.doctorId.userId.firstName} ${appointment.doctorId.userId.lastName}`,
        consultationId: consultation._id.toString(),
        appointmentDate: appointment.date,
        appointmentTime: appointment.startTime,
      }).catch(err => logger.warn('Consultation started notification failed', { error: err.message }));
    });

    // Get client config to send to doctor
    const clientConfig = await provider.getClientConfig(videoSettings);

    res.json({
      success: true,
      message: 'Consultation started.',
      data: {
        consultation,
        roomName: consultation.roomUrl,
        provider: provider.name,
        clientConfig,
        doctorId: appointment.doctorId._id.toString(),
        patientId: appointment.patientId._id.toString(),
      },
    });
  } catch (error) { next(error); }
}

/**
 * GET /api/consultations/:id
 * Get consultation details. Validates that the requesting user is
 * either the assigned doctor or patient.
 */
async function getConsultation(req, res, next) {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate({ path: 'appointmentId', populate: { path: 'serviceId', select: 'name' } })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName email' } })
      .populate({ path: 'patientId', select: 'firstName lastName email' });

    if (!consultation) throw new AppError('Consultation not found.', 404, ErrorCodes.NOT_FOUND);

    // SECURITY: Only assigned doctor or patient can access this consultation
    const userId = req.user.id;
    const doctorUserId = consultation.doctorId?.userId?._id?.toString();
    const patientId = consultation.patientId?._id?.toString();

    if (req.user.role === 'DOCTOR') {
      if (doctorUserId !== userId) {
        throw new AppError('You are not authorized to access this consultation.', 403, ErrorCodes.FORBIDDEN);
      }
    } else if (req.user.role === 'PATIENT') {
      if (patientId !== userId) {
        throw new AppError('You are not authorized to access this consultation.', 403, ErrorCodes.FORBIDDEN);
      }
    }
    // Admins can access for monitoring purposes

    // Get provider client config
    const videoSettings = await VideoSettings.getSettings();
    const provider = await getActiveProvider();
    const clientConfig = await provider.getClientConfig(videoSettings);

    res.json({
      success: true,
      data: {
        consultation,
        currentUserId: userId,
        currentUserRole: req.user.role,
        clientConfig,
      },
    });
  } catch (error) { next(error); }
}

/**
 * PUT /api/consultations/:id/complete
 * Doctor ends the consultation. Records duration, sends notifications.
 */
async function completeConsultation(req, res, next) {
  try {
    const { notes, followUpDate } = req.body;
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) throw new AppError('Consultation not found.', 404, ErrorCodes.NOT_FOUND);

    // SECURITY: Only the assigned doctor can complete
    const doctorUserId = consultation.doctorId
      ? (await require('../models').DoctorProfile.findById(consultation.doctorId).populate('userId'))?.userId?._id?.toString()
      : null;
    if (doctorUserId && doctorUserId !== req.user.id) {
      throw new AppError('You are not authorized to complete this consultation.', 403, ErrorCodes.FORBIDDEN);
    }

    const now = new Date();
    consultation.status = 'COMPLETED';
    consultation.endedAt = now;
    consultation.notes = notes || consultation.notes;
    consultation.followUpDate = followUpDate ? new Date(followUpDate) : null;

    // Calculate duration in minutes
    if (consultation.startedAt) {
      consultation.duration = Math.round((now - consultation.startedAt) / 60000);
    }

    await consultation.save();

    // Clean up provider room
    try {
      const provider = await getActiveProvider();
      await provider.endRoom(consultation.roomUrl, await VideoSettings.getSettings());
    } catch (err) {
      logger.warn('Provider room cleanup failed', { error: err.message });
    }

    // Notify room that consultation ended
    const { emitToRoom } = require('../config/socket');
    emitToRoom(`consultation:${consultation._id}`, 'consultation:ended', {
      consultationId: consultation._id,
      duration: consultation.duration,
    });

    // Populate for notification
    const populated = await Consultation.findById(consultation._id)
      .populate({ path: 'appointmentId' })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .populate({ path: 'patientId', select: 'firstName lastName email' });

    // Send consultation completion notification + email
    setImmediate(() => {
      const appointment = populated.appointmentId;
      if (appointment) {
        appointment.patientId = populated.patientId;
        appointment.doctorId = populated.doctorId;
        notifyConsultationComplete(appointment).catch((err) => logger.error('Consultation complete notification error', { err: err.message }));
      }
    });

    res.json({ success: true, message: 'Consultation completed.', data: populated });
  } catch (error) { next(error); }
}

/**
 * GET /api/consultations
 * Get consultations for the current user (doctor or patient).
 */
async function getPatientConsultations(req, res, next) {
  try {
    let query = {};
    if (req.user.role === 'DOCTOR') {
      const dp = await require('../models').DoctorProfile.findOne({ userId: req.user.id }).select('_id');
      query.doctorId = dp?._id;
    } else {
      query.patientId = req.user.id;
    }
    const consultations = await Consultation.find(query)
      .populate({ path: 'appointmentId', populate: [{ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } }, { path: 'serviceId', select: 'name' }] })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: consultations });
  } catch (error) { next(error); }
}

module.exports = { startConsultation, getConsultation, completeConsultation, getPatientConsultations };
