const express = require('express');
const router = express.Router();
const { publicFormLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { contactSchema } = require('../validators/commonValidator');
const publicController = require('../controllers/publicController');

router.post('/contact', publicFormLimiter, validate(contactSchema), publicController.submitContact);
router.post('/careers', publicFormLimiter, publicController.submitCareerApplication);

module.exports = router;
