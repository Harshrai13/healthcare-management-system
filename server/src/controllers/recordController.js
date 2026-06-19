const { MedicalRecord, DoctorProfile } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');
const logger = require('../utils/logger');
const { notifyMedicalRecordCreated } = require('../utils/notificationService');

async function getRecords(req, res, next) {
  try {
    const { patientId, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (req.user.role === 'PATIENT') {
      where.patientId = req.user.id;
    } else if (patientId) {
      where.patientId = patientId;
    }

    const [records, total] = await Promise.all([
      MedicalRecord.find(where)
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
        .populate({ path: 'patientId', select: 'firstName lastName' })
        .populate({ path: 'appointmentId', populate: { path: 'serviceId', select: 'name' } })
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      MedicalRecord.countDocuments(where),
    ]);

    res.json({
      success: true,
      data: {
        records,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createRecord(req, res, next) {
  try {
    const { patientId, appointmentId, diagnosis, treatmentPlan, medications, allergies, notes } = req.body;
    const doctorProfile = await DoctorProfile.findOne({ userId: req.user.id });

    const record = await MedicalRecord.create({
      patientId,
      doctorId: doctorProfile._id,
      appointmentId,
      diagnosis,
      treatmentPlan,
      medications,
      allergies,
      notes,
    });

    // Populate for notification
    await record.populate([
      { path: 'patientId', select: 'firstName lastName email' },
      { path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } },
    ]);

    // Fire-and-forget medical record notification
    notifyMedicalRecordCreated(record).catch((err) => logger.error('Notification error', { err: err.message }));

    res.status(201).json({ success: true, message: 'Medical record created.', data: record });
  } catch (error) {
    next(error);
  }
}

async function getRecordById(req, res, next) {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .populate({ path: 'patientId', select: 'firstName lastName email' })
      .populate('appointmentId');

    if (!record) {
      throw new AppError('Medical record not found.', 404, ErrorCodes.NOT_FOUND);
    }

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
}

module.exports = { getRecords, createRecord, getRecordById };
