const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

router.use(authenticate);

router.get('/conversations', messageController.getConversations);
router.get('/:partnerId', messageController.getMessages);
router.post('/', messageController.sendMessage);
router.patch('/:partnerId/read', messageController.markMessagesRead);

module.exports = router;
