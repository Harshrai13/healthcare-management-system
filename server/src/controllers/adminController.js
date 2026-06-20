const { User, DoctorProfile, Appointment, Payment, AuditLog } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');
const logger = require('../utils/logger');
const { generateAuthTokens } = require('../utils/token');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function loginAsUser(req, res, next) {
  try {
    const targetUser = await User.findById(req.params.userId).select('_id email firstName lastName role isActive');
    if (!targetUser) throw new AppError('User not found.', 404, ErrorCodes.NOT_FOUND);
    if (!targetUser.isActive) throw new AppError('This user account is deactivated.', 400, ErrorCodes.VALIDATION_ERROR);
    if (targetUser.role === 'SUPER_ADMIN') throw new AppError('Cannot impersonate another admin.', 403, ErrorCodes.FORBIDDEN);
    const tokens = generateAuthTokens(targetUser);
    logger.info('Admin impersonation', { adminId: req.user.id, targetUserId: targetUser._id, targetRole: targetUser.role });
    res.json({ success: true, message: `Logged in as ${targetUser.firstName} ${targetUser.lastName}`, data: { user: targetUser, accessToken: tokens.accessToken, impersonating: true } });
  } catch (error) { next(error); }
}

async function searchUsers(req, res, next) {
  try {
    const { q = '', role, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pipeline = [];
    if (q) pipeline.push({ $match: { $or: [{ firstName: { $regex: q, $options: 'i' } }, { lastName: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }] } });
    if (role) pipeline.push({ $match: { role } });
    pipeline.push({ $facet: { users: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: parseInt(limit) }, { $lookup: { from: 'doctorprofiles', localField: '_id', foreignField: 'userId', as: 'doctorProfile' } }, { $project: { _id: 1, email: 1, firstName: 1, lastName: 1, role: 1, isActive: 1, createdAt: 1, doctorProfile: { $cond: [{ $gt: [{ $size: '$doctorProfile' }, 0] }, { $arrayElemAt: '$doctorProfile' }, null] } } }, { $project: { _id: 1, email: 1, firstName: 1, lastName: 1, role: 1, isActive: 1, createdAt: 1, 'doctorProfile.specialty': 1 } }], total: [{ $count: 'count' }] } });
    const result = await User.aggregate(pipeline);
    const users = result[0]?.users || [];
    const total = result[0]?.total?.[0]?.count || 0;
    res.json({ success: true, data: { users, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) { next(error); }
}

async function getDashboard(req, res, next) {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalPatients, totalDoctors, todayAppts, pendingAppts, completedAppts, revenueResult, recentAppts] = await Promise.all([
      User.countDocuments({ role: 'PATIENT', isActive: true }),
      DoctorProfile.countDocuments({ isAvailable: true }),
      Appointment.countDocuments({ date: { $gte: today } }),
      Appointment.countDocuments({ status: 'PENDING' }),
      Appointment.countDocuments({ status: 'COMPLETED' }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Appointment.find().sort({ createdAt: -1 }).limit(10)
        .populate({ path: 'patientId', select: 'firstName lastName' })
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
        .populate({ path: 'serviceId', select: 'name' }),
    ]);
    res.json({ success: true, data: { stats: { totalPatients, totalDoctors, todayAppointments: todayAppts, pendingAppointments: pendingAppts, completedAppointments: completedAppts, totalRevenue: revenueResult[0]?.total || 0 }, recentAppointments: recentAppts } });
  } catch (error) { next(error); }
}

async function getAnalytics(req, res, next) {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(); startDate.setDate(startDate.getDate() - days);
    const [byStatus, byType, topDoctors, revenue] = await Promise.all([
      Appointment.aggregate([{ $match: { createdAt: { $gte: startDate } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.aggregate([{ $match: { createdAt: { $gte: startDate } } }, { $group: { _id: '$consultationType', count: { $sum: 1 } } }]),
      DoctorProfile.find().sort({ reviewCount: -1 }).limit(5).populate({ path: 'userId', select: 'firstName lastName' }),
      Payment.aggregate([{ $match: { createdAt: { $gte: startDate } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, totalAmount: { $sum: '$amount' } } }]),
    ]);
    res.json({ success: true, data: { appointmentsByStatus: byStatus, appointmentsByType: byType, topDoctors, revenueByMonth: revenue, period: `${days} days` } });
  } catch (error) { next(error); }
}

async function getUsers(req, res, next) {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (role) where.role = role;
    if (search) where.$or = [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const [users, total] = await Promise.all([
      User.find(where).select('_id email firstName lastName phone role isActive createdAt').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(where),
    ]);
    res.json({ success: true, data: { users, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) { next(error); }
}

async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const validRoles = ['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'BILLING_STAFF', 'CONTENT_MANAGER', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) throw new AppError('Invalid role specified.', 400, ErrorCodes.VALIDATION_ERROR);
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, projection: '_id email firstName lastName role' });
    if (!user) throw new AppError('User not found.', 404, ErrorCodes.NOT_FOUND);
    logger.info('User role updated', { adminId: req.user.id, targetUserId: user._id, newRole: role });
    await AuditLog.create({ userId: req.user.id, action: 'UPDATE_ROLE', entity: 'User', entityId: user._id.toString(), newValue: JSON.stringify({ role }), ipAddress: req.ip });
    res.json({ success: true, message: 'User role updated.', data: user });
  } catch (error) { next(error); }
}

async function getAuditLogs(req, res, next) {
  try {
    const { action, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (action) where.action = action;
    const [logs, total] = await Promise.all([
      AuditLog.find(where).populate({ path: 'userId', select: 'firstName lastName email' }).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      AuditLog.countDocuments(where),
    ]);
    res.json({ success: true, data: { logs, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) { next(error); }
}

async function createDoctor(req, res, next) {
  try {
    const { firstName, lastName, email, specialty, experience } = req.body;
    if (!firstName || !lastName || !email) {
      throw new AppError('First name, last name and email are required.', 400, ErrorCodes.VALIDATION_ERROR);
    }
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('A user with this email already exists.', 400, ErrorCodes.VALIDATION_ERROR);
    }
    // Generate a temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: 'DOCTOR',
      isActive: true,
      isVerified: true,
    });

    const doctorProfile = await DoctorProfile.create({
      userId: user._id,
      specialty: specialty || 'General Practice',
      experienceYears: parseInt(experience) || 0,
      consultationModes: ['IN_PERSON', 'VIDEO'],
      isAvailable: true,
    });

    logger.info('Doctor created by admin', { adminId: req.user.id, doctorId: user._id });
    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE_DOCTOR',
      entity: 'User',
      entityId: user._id.toString(),
      newValue: JSON.stringify({ email: user.email, specialty: doctorProfile.specialty }),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Doctor added successfully. Temporary password: ' + tempPassword,
      data: {
        user: { _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        doctorProfile,
        tempPassword,
      },
    });
  } catch (error) { next(error); }
}

module.exports = { getDashboard, getAnalytics, getUsers, updateUserRole, getAuditLogs, loginAsUser, searchUsers, createDoctor };
