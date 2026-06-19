const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const publicController = require('../controllers/publicController');

router.post('/contact', authLimiter, publicController.submitContact);
router.post('/careers', authLimiter, publicController.submitCareerApplication);

module.exports = router;
