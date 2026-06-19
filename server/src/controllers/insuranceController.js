const { InsuranceInfo } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');
const logger = require('../utils/logger');

async function getInsuranceInfo(req, res, next) {
  try {
    const { patientId } = req.query;
    const where = {};
    if (patientId) where.patientId = patientId;
    if (req.user.role === 'PATIENT') where.patientId = req.user.id;

    const insurance = await InsuranceInfo.find(where)
      .populate({ path: 'patientId', select: 'firstName lastName email' })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: insurance });
  } catch (error) {
    next(error);
  }
}

async function getInsuranceById(req, res, next) {
  try {
    const insurance = await InsuranceInfo.findById(req.params.id)
      .populate({ path: 'patientId', select: 'firstName lastName email phone' });

    if (!insurance) throw new AppError('Insurance record not found.', 404, ErrorCodes.NOT_FOUND);
    res.json({ success: true, data: insurance });
  } catch (error) {
    next(error);
  }
}

async function createInsuranceInfo(req, res, next) {
  try {
    const { patientId, provider, policyNumber, policyHolderName, relationship, groupNumber, effectiveDate, expiryDate, coverageType, notes } = req.body;
    const insurance = await InsuranceInfo.create({
      patientId, provider, policyNumber, policyHolderName, relationship, groupNumber,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      coverageType, notes,
    });
    await insurance.populate({ path: 'patientId', select: 'firstName lastName email' });
    logger.info('Insurance info created', { insuranceId: insurance._id });
    res.status(201).json({ success: true, message: 'Insurance info added.', data: insurance });
  } catch (error) {
    next(error);
  }
}

async function updateInsuranceInfo(req, res, next) {
  try {
    const updateData = { ...req.body };
    if (updateData.effectiveDate) updateData.effectiveDate = new Date(updateData.effectiveDate);
    if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);

    const insurance = await InsuranceInfo.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate({ path: 'patientId', select: 'firstName lastName email' });

    if (!insurance) throw new AppError('Insurance record not found.', 404, ErrorCodes.NOT_FOUND);
    logger.info('Insurance info updated', { insuranceId: insurance._id });
    res.json({ success: true, message: 'Insurance info updated.', data: insurance });
  } catch (error) {
    next(error);
  }
}

async function deleteInsuranceInfo(req, res, next) {
  try {
    const insurance = await InsuranceInfo.findByIdAndDelete(req.params.id);
    if (!insurance) throw new AppError('Insurance record not found.', 404, ErrorCodes.NOT_FOUND);
    logger.info('Insurance info deleted', { insuranceId: insurance._id });
    res.json({ success: true, message: 'Insurance info deleted.' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getInsuranceInfo, getInsuranceById, createInsuranceInfo, updateInsuranceInfo, deleteInsuranceInfo };
