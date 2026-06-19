const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const ALL_ADMIN = ['SUPER_ADMIN', 'CONTENT_MANAGER', 'BILLING_STAFF', 'RECEPTIONIST'];

router.use(authenticate);

router.get('/dashboard', authorize(...ALL_ADMIN), adminController.getDashboard);
router.get('/analytics', authorize('SUPER_ADMIN', 'BILLING_STAFF'), adminController.getAnalytics);
router.get('/users', authorize('SUPER_ADMIN', 'RECEPTIONIST'), adminController.getUsers);
router.get('/users/search', authorize('SUPER_ADMIN'), adminController.searchUsers);
router.put('/users/:id/role', authorize('SUPER_ADMIN'), adminController.updateUserRole);
router.post('/login-as/:userId', authorize('SUPER_ADMIN'), adminController.loginAsUser);
router.get('/audit-logs', authorize('SUPER_ADMIN'), adminController.getAuditLogs);

module.exports = router;
