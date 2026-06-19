const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const recordController = require('../controllers/recordController');

router.get('/', authenticate, recordController.getRecords);
router.post('/', authenticate, authorize('DOCTOR', 'SUPER_ADMIN'), recordController.createRecord);
router.get('/:id', authenticate, recordController.getRecordById);

module.exports = router;
