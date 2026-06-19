const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const documentController = require('../controllers/documentController');

router.post('/upload', authenticate, upload.single('file'), documentController.uploadDocument);
router.get('/', authenticate, documentController.getDocuments);
router.delete('/:id', authenticate, documentController.deleteDocument);

module.exports = router;
