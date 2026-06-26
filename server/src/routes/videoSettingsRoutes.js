const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getVideoSettings,
  updateVideoSettings,
  getIceServers,
  getClientConfig,
} = require('../controllers/videoSettingsController');

// Admin: full CRUD
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), getVideoSettings);
router.put('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), updateVideoSettings);

// Any authenticated user: ICE servers + client config (needed for video calls)
router.get('/ice-servers', authenticate, getIceServers);
router.get('/client-config', authenticate, getClientConfig);

module.exports = router;
