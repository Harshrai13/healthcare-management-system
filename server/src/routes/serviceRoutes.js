const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const serviceController = require('../controllers/serviceController');

router.get('/', serviceController.getAllServices);
router.get('/:slug', serviceController.getServiceBySlug);
router.post('/', authenticate, authorize('SUPER_ADMIN'), serviceController.createService);
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), serviceController.updateService);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), serviceController.deleteService);

module.exports = router;
