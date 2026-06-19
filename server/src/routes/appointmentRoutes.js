const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { apiLimiter } = require('../middleware/rateLimiter');
const { appointmentSchema } = require('../validators/commonValidator');
const appointmentController = require('../controllers/appointmentController');

router.post('/', authenticate, apiLimiter, validate(appointmentSchema), appointmentController.createAppointment);
router.get('/', authenticate, appointmentController.getAppointments);
router.get('/:id', authenticate, appointmentController.getAppointmentById);
router.put('/:id', authenticate, appointmentController.updateAppointment);
router.put('/:id/cancel', authenticate, appointmentController.cancelAppointment);
router.post('/:id/reschedule', authenticate, validate(appointmentSchema), appointmentController.rescheduleAppointment);
router.post('/waitlist', authenticate, appointmentController.addToWaitlist);

module.exports = router;
