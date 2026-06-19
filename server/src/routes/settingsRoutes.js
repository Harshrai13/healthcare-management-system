const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

// GET /settings - accessible to authenticated users (for loading settings)
router.get('/', authenticate, settingsController.getSettings);

// PUT /settings - SUPER_ADMIN only
router.put('/', authenticate, authorize('SUPER_ADMIN'), settingsController.updateSettings);

module.exports = router;
