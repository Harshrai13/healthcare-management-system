const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const prescriptionController = require('../controllers/prescriptionController');

router.get('/', authenticate, prescriptionController.getPrescriptions);
router.post('/', authenticate, authorize('DOCTOR', 'SUPER_ADMIN'), prescriptionController.createPrescription);
router.get('/:id', authenticate, prescriptionController.getPrescriptionById);

module.exports = router;
