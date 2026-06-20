const { Appointment, Consultation } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');

async function startConsultation(req, res, next) {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .populate({ path: 'patientId', select: 'firstName lastName' });
    if (!appointment) throw new AppError('Appointment not found.', 404, ErrorCodes.NOT_FOUND);
    if (appointment.consultationType !== 'VIDEO') throw new AppError('This appointment is not a video consultation.', 400, ErrorCodes.VALIDATION_ERROR);

    const roomName = `verdantcare-${appointmentId}`;

    // Find existing consultation or create one
    let consultation = await Consultation.findOne({ appointmentId });
    if (!consultation) {
      consultation = await Consultation.create({
        appointmentId,
        doctorId: appointment.doctorId._id,
        patientId: appointment.patientId._id,
        roomUrl: roomName,
        status: 'WAITING',
      });
    }

    const doctorName = `${appointment.doctorId.userId.firstName} ${appointment.doctorId.userId.lastName}`;

    // Update consultation status
    consultation.status = 'IN_PROGRESS';
    consultation.startedAt = new Date();
    await consultation.save();

    // Notify patient via Socket.io that doctor has started the call
    const { emitToUser } = require('../config/socket');
    emitToUser(appointment.patientId._id.toString(), 'consultation:started', {
      consultationId: consultation._id,
      appointmentId: appointment._id,
      doctorName,
      roomName,
    });

    res.json({
      success: true,
      message: 'Consultation started.',
      data: {
        consultation,
        roomName,
        doctorId: appointment.doctorId._id.toString(),
        patientId: appointment.patientId._id.toString(),
      },
    });
  } catch (error) { next(error); }
}

async function getConsultation(req, res, next) {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate({ path: 'appointmentId', populate: { path: 'serviceId', select: 'name' } })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .populate({ path: 'patientId', select: 'firstName lastName email' });
    if (!consultation) throw new AppError('Consultation not found.', 404, ErrorCodes.NOT_FOUND);

    res.json({
      success: true,
      data: {
        consultation,
        currentUserId: req.user.id,
        currentUserRole: req.user.role,
      },
    });
  } catch (error) { next(error); }
}

async function completeConsultation(req, res, next) {
  try {
    const { notes, followUpDate } = req.body;
    const consultation = await Consultation.findByIdAndUpdate(req.params.id, {
      status: 'COMPLETED', endedAt: new Date(), notes,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    }, { new: true });

    // Notify via socket that consultation ended
    const { emitToRoom } = require('../config/socket');
    emitToRoom(`consultation:${consultation._id}`, 'consultation:ended', { consultationId: consultation._id });

    res.json({ success: true, message: 'Consultation completed.', data: consultation });
  } catch (error) { next(error); }
}

async function getPatientConsultations(req, res, next) {
  try {
    const patientId = req.user.id;
    const consultations = await Consultation.find({ patientId })
      .populate({ path: 'appointmentId', populate: [{ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } }, { path: 'serviceId', select: 'name' }] })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: consultations });
  } catch (error) { next(error); }
}

module.exports = { startConsultation, getConsultation, completeConsultation, getPatientConsultations };
