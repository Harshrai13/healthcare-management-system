const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { reviewSchema } = require('../validators/commonValidator');
const reviewController = require('../controllers/reviewController');

// Public routes (no auth required)
router.get('/public/stats', reviewController.getPublicStats);
router.get('/public/featured', reviewController.getFeaturedReviews);
router.post('/', validate(reviewSchema), reviewController.createReview);
router.get('/', reviewController.getReviews);
router.get('/doctor/:doctorId', reviewController.getDoctorReviews);

// Admin only
router.get('/admin', authenticate, authorize('SUPER_ADMIN'), reviewController.getAdminAllReviews);
router.put('/:id/approve', authenticate, authorize('SUPER_ADMIN'), reviewController.approveReview);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), reviewController.deleteReview);

module.exports = router;
