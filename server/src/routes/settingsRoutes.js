const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const settingsController = require('../controllers/settingsController');

// Public settings (no auth) — for footer, contact page, etc.
router.get('/public', settingsController.getPublicSettings);

// GET /settings - accessible to authenticated users (for loading settings)
router.get('/', authenticate, settingsController.getSettings);

// PUT /settings - SUPER_ADMIN only
router.put('/', authenticate, authorize('SUPER_ADMIN'), settingsController.updateSettings);

// POST /settings/logo - upload logo image
router.post('/logo', authenticate, authorize('SUPER_ADMIN'), upload.single('logo'), settingsController.uploadLogo);

// GET /settings/payment-config - get payment gateway config (masked secrets)
router.get('/payment-config', authenticate, authorize('SUPER_ADMIN'), settingsController.getPaymentConfig);

module.exports = router;
