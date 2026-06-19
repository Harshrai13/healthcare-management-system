const { User, DoctorProfile, Appointment, Review } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');

async function getPublicStats(req, res, next) {
  try {
    const [patientCount, doctorCount, appointmentCount, reviewStats] = await Promise.all([
      User.countDocuments({ role: 'PATIENT', isActive: true }),
      User.countDocuments({ role: 'DOCTOR', isActive: true }),
      Appointment.countDocuments({ status: 'COMPLETED' }),
      Review.aggregate([{ $match: { isApproved: true } }, { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    ]);
    const avgRating = reviewStats[0]?.avgRating || 0;
    const reviewCount = reviewStats[0]?.count || 0;
    const successRate = avgRating ? Math.round((avgRating / 5) * 100) : 98;
    res.json({ success: true, data: { patients: patientCount, doctors: doctorCount, completedAppointments: appointmentCount, reviewCount, avgRating: Math.round(avgRating * 10) / 10, successRate } });
  } catch (error) { next(error); }
}

async function getFeaturedReviews(req, res, next) {
  try {
    const reviews = await Review.find({ isApproved: true, rating: { $gte: 4 } })
      .populate({ path: 'patientId', select: 'firstName lastName avatar' })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
      .sort({ isFeatured: -1, rating: -1, createdAt: -1 }).limit(6);
    res.json({ success: true, data: reviews });
  } catch (error) { next(error); }
}

async function createReview(req, res, next) {
  try {
    const { doctorId, appointmentId, rating, comment } = req.body;
    if (appointmentId) {
      const existingReview = await Review.findOne({ patientId: req.user.id, appointmentId });
      if (existingReview) throw new AppError('You have already reviewed this appointment.', 409, ErrorCodes.CONFLICT);
    }
    const review = await Review.create({ patientId: req.user.id, doctorId: doctorId || null, appointmentId: appointmentId || null, rating, comment, isApproved: false });
    res.status(201).json({ success: true, message: 'Review submitted for moderation.', data: review });
  } catch (error) { next(error); }
}

async function getReviews(req, res, next) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      Review.find({ isApproved: true })
        .populate({ path: 'patientId', select: 'firstName lastName' })
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
        .skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Review.countDocuments({ isApproved: true }),
    ]);
    res.json({ success: true, data: { reviews, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) { next(error); }
}

async function getDoctorReviews(req, res, next) {
  try {
    const reviews = await Review.find({ doctorId: req.params.doctorId, isApproved: true })
      .populate({ path: 'patientId', select: 'firstName lastName' }).sort({ createdAt: -1 }).limit(10);
    const avgResult = await Review.aggregate([
      { $match: { doctorId: req.params.doctorId, isApproved: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]);
    res.json({ success: true, data: { reviews, averageRating: avgResult[0]?.avgRating || 0 } });
  } catch (error) { next(error); }
}

async function approveReview(req, res, next) {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
    if (!review) throw new AppError('Review not found.', 404, ErrorCodes.NOT_FOUND);
    const avgResult = await Review.aggregate([
      { $match: { doctorId: review.doctorId, isApproved: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await DoctorProfile.findByIdAndUpdate(review.doctorId, { reviewCount: avgResult[0]?.count || 0, rating: avgResult[0]?.avgRating || 0 });
    res.json({ success: true, message: 'Review approved.', data: review });
  } catch (error) { next(error); }
}

async function deleteReview(req, res, next) {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Review deleted.' });
  } catch (error) { next(error); }
}

async function getAdminAllReviews(req, res, next) {
  try {
    const { page = 1, limit = 20, search, rating } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    if (rating && rating !== 'ALL') filter.rating = parseInt(rating);
    if (search) {
      filter.$or = [
        { comment: { $regex: search, $options: 'i' } },
      ];
    }
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate({ path: 'patientId', select: 'firstName lastName avatar' })
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName' } })
        .skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Review.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: {
        reviews,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) { next(error); }
}

module.exports = { createReview, getReviews, getDoctorReviews, approveReview, deleteReview, getPublicStats, getFeaturedReviews, getAdminAllReviews };
