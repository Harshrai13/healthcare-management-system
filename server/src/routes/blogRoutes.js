const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const blogController = require('../controllers/blogController');

router.get('/', blogController.getPosts);
router.get('/admin/all', authenticate, authorize('CONTENT_MANAGER', 'SUPER_ADMIN'), blogController.getAdminAllPosts);
router.get('/:slug', blogController.getPostBySlug);
router.post('/', authenticate, authorize('CONTENT_MANAGER', 'SUPER_ADMIN'), blogController.createPost);
router.put('/:id', authenticate, authorize('CONTENT_MANAGER', 'SUPER_ADMIN'), blogController.updatePost);
router.delete('/:id', authenticate, authorize('CONTENT_MANAGER', 'SUPER_ADMIN'), blogController.deletePost);

module.exports = router;
