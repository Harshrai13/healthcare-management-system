const { Prescription, DoctorProfile } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');
const logger = require('../utils/logger');
const { notifyPrescriptionIssued } = require('../utils/notificationService');

async function getPrescriptions(req, res, next) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (req.user.role === 'PATIENT') {
      where.patientId = req.user.id;
    }

    const [prescriptions, total] = await Promise.all([
      Prescription.find(where)
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
        .populate({ path: 'patientId', select: 'firstName lastName' })
        .skip(skip)
        .limit(limitNum)
        .sort({ issuedAt: -1 }),
      Prescription.countDocuments(where),
    ]);

    res.json({
      success: true,
      data: {
        prescriptions,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createPrescription(req, res, next) {
  try {
    const { patientId, appointmentId, medications, instructions } = req.body;
    const doctorProfile = await DoctorProfile.findOne({ userId: req.user.id });

    const prescription = await Prescription.create({
      patientId,
      doctorId: doctorProfile._id,
      appointmentId,
      medications,
      instructions,
      issuedAt: new Date(),
    });

    // Populate for notification
    await prescription.populate([
      { path: 'patientId', select: 'firstName lastName email' },
      { path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } },
    ]);

    // Truly fire-and-forget: defer to next tick
    setImmediate(() => {
      notifyPrescriptionIssued(prescription).catch((err) => logger.error('Notification error', { err: err.message }));
    });

    res.status(201).json({ success: true, message: 'Prescription created.', data: prescription });
  } catch (error) {
    next(error);
  }
}

async function getPrescriptionById(req, res, next) {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .populate({ path: 'patientId', select: 'firstName lastName email' });

    if (!prescription) {
      throw new AppError('Prescription not found.', 404, ErrorCodes.NOT_FOUND);
    }

    res.json({ success: true, data: prescription });
  } catch (error) {
    next(error);
  }
}

module.exports = { getPrescriptions, createPrescription, getPrescriptionById };
