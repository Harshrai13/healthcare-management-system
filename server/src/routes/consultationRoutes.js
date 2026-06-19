const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const consultationController = require('../controllers/consultationController');

router.post('/:appointmentId/start', authenticate, authorize('DOCTOR'), consultationController.startConsultation);
router.get('/', authenticate, consultationController.getPatientConsultations);
router.get('/:id', authenticate, consultationController.getConsultation);
router.put('/:id/complete', authenticate, authorize('DOCTOR'), consultationController.completeConsultation);

module.exports = router;
