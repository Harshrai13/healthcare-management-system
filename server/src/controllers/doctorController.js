const { DoctorProfile } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');

async function getAllDoctors(req, res, next) {
  try {
    const { specialty, gender, language, available, search, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let pipeline = [];
    pipeline.push({ $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } });
    pipeline.push({ $unwind: '$user' });
    pipeline.push({ $match: { 'user.isActive': true } });

    if (search) pipeline.push({ $match: { $or: [{ 'user.firstName': { $regex: search, $options: 'i' } }, { 'user.lastName': { $regex: search, $options: 'i' } }, { specialty: { $regex: search, $options: 'i' } }] } });
    if (specialty) pipeline.push({ $match: { specialty } });
    if (gender) pipeline.push({ $match: { gender } });
    if (available === 'true') pipeline.push({ $match: { isAvailable: true } });
    if (language) pipeline.push({ $match: { languages: language } });

    const [doctors, countResult] = await Promise.all([
      DoctorProfile.aggregate([...pipeline, { $sort: { rating: -1 } }, { $skip: skip }, { $limit: limitNum },
        { $project: { _id: 1, specialty: 1, bio: 1, education: 1, certifications: 1, languages: 1, gender: 1, experienceYears: 1, consultationModes: 1, rating: 1, reviewCount: 1, isAvailable: 1, user: { firstName: 1, lastName: 1, email: 1, avatar: 1 } } }]),
      DoctorProfile.aggregate([...pipeline, { $count: 'total' }]),
    ]);
    const total = countResult[0]?.total || 0;
    res.json({ success: true, data: { doctors, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } } });
  } catch (error) { next(error); }
}

async function getDoctorById(req, res, next) {
  try {
    const doctor = await DoctorProfile.findById(req.params.id).populate({ path: 'userId', select: 'firstName lastName email avatar' });
    if (!doctor) throw new AppError('Doctor not found.', 404, ErrorCodes.NOT_FOUND);
    const availableSchedules = doctor.schedules.filter((s) => s.isAvailable).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    res.json({ success: true, data: { ...doctor.toObject(), schedules: availableSchedules } });
  } catch (error) { next(error); }
}

async function getDoctorSchedule(req, res, next) {
  try {
    const doctor = await DoctorProfile.findById(req.params.id);
    if (!doctor) throw new AppError('Doctor not found.', 404, ErrorCodes.NOT_FOUND);
    const schedules = doctor.schedules.filter((s) => s.isAvailable).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    const timeOff = doctor.timeOffs.filter((t) => t.endDate >= new Date());
    res.json({ success: true, data: { schedules, timeOff } });
  } catch (error) { next(error); }
}

async function getDoctorAvailability(req, res, next) {
  try {
    const { date } = req.query;
    if (!date) throw new AppError('Date is required.', 400, ErrorCodes.VALIDATION_ERROR);

    const doctor = await DoctorProfile.findById(req.params.id);
    if (!doctor) throw new AppError('Doctor not found.', 404, ErrorCodes.NOT_FOUND);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const { Appointment } = require('../models');
    const booked = await Appointment.find({
      doctorId: doctor._id,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['CANCELLED', 'NO_SHOW'] },
    }).select('startTime');

    res.json({ success: true, data: { bookedSlots: booked.map((b) => b.startTime) } });
  } catch (error) {
    next(error);
  }
}

async function updateDoctorProfile(req, res, next) {
  try {
    const { bio, education, certifications, languages, consultationModes, isAvailable } = req.body;
    const doctor = await DoctorProfile.findOneAndUpdate({ userId: req.user.id }, { bio, education, certifications, languages, consultationModes, isAvailable }, { new: true });
    if (!doctor) throw new AppError('Doctor profile not found.', 404, ErrorCodes.NOT_FOUND);
    res.json({ success: true, message: 'Profile updated successfully.', data: doctor });
  } catch (error) { next(error); }
}

module.exports = { getAllDoctors, getDoctorById, getDoctorSchedule, getDoctorAvailability, updateDoctorProfile };
