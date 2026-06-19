const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const insuranceController = require('../controllers/insuranceController');

router.get('/', authenticate, insuranceController.getInsuranceInfo);
router.get('/:id', authenticate, insuranceController.getInsuranceById);
router.post('/', authenticate, authorize('BILLING_STAFF', 'SUPER_ADMIN', 'RECEPTIONIST'), insuranceController.createInsuranceInfo);
router.put('/:id', authenticate, authorize('BILLING_STAFF', 'SUPER_ADMIN', 'RECEPTIONIST'), insuranceController.updateInsuranceInfo);
router.delete('/:id', authenticate, authorize('BILLING_STAFF', 'SUPER_ADMIN'), insuranceController.deleteInsuranceInfo);

module.exports = router;
