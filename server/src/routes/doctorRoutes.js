const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const doctorController = require('../controllers/doctorController');

router.get('/', doctorController.getAllDoctors);
router.get('/:id', doctorController.getDoctorById);
router.get('/:id/schedule', doctorController.getDoctorSchedule);
router.get('/:id/availability', doctorController.getDoctorAvailability);
router.put('/:id/profile', authenticate, authorize('DOCTOR', 'SUPER_ADMIN'), doctorController.updateDoctorProfile);

module.exports = router;
