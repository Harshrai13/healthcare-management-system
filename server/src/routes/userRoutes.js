const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateProfileSchema, changePasswordSchema } = require('../validators/authValidator');
const userController = require('../controllers/userController');

router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.put('/change-password', authenticate, validate(changePasswordSchema), userController.changePassword);
router.post('/two-factor/setup', authenticate, userController.setupTwoFactor);
router.post('/two-factor/verify', authenticate, userController.verifyTwoFactor);
router.put('/two-factor/disable', authenticate, userController.disableTwoFactor);

module.exports = router;
