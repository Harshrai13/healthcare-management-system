const { Message, User, DoctorProfile } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');
const { emitToUser, emitToRoom } = require('../config/socket');
const logger = require('../utils/logger');

async function getConversations(req, res, next) {
  try {
    const userId = req.user.id;

    // Get all unique conversation partners
    const messages = await Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { recipientId: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', userId] },
              '$recipientId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$content' },
          lastMessageAt: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$recipientId', userId] }, { $eq: ['$readAt', null] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
    ]);

    // Populate partner info
    const partnerIds = messages.map((m) => m._id);
    const partners = await User.find({ _id: { $in: partnerIds } }).select('firstName lastName avatar role');
    const partnerMap = {};
    partners.forEach((p) => { partnerMap[p._id.toString()] = p; });

    // Get doctor profiles for doctor partners
    const doctorProfiles = await DoctorProfile.find({ userId: { $in: partnerIds } }).select('userId specialty');
    const doctorMap = {};
    doctorProfiles.forEach((dp) => { doctorMap[dp.userId.toString()] = dp; });

    const conversations = messages.map((m) => {
      const partner = partnerMap[m._id.toString()];
      const doctor = doctorMap[m._id.toString()];
      const roomId = Message.getRoomId(userId, m._id);
      return {
        roomId,
        partner: partner ? {
          id: partner._id,
          name: `${partner.firstName} ${partner.lastName}`,
          avatar: partner.avatar,
          role: partner.role,
          specialty: doctor?.specialty,
        } : null,
        lastMessage: m.lastMessage,
        lastMessageAt: m.lastMessageAt,
        unreadCount: m.unreadCount,
      };
    }).filter((c) => c.partner);

    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const { partnerId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const roomId = Message.getRoomId(req.user.id, partnerId);

    const [messages, total] = await Promise.all([
      Message.find({ roomId })
        .populate({ path: 'senderId', select: 'firstName lastName avatar' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Message.countDocuments({ roomId }),
    ]);

    // Mark unread messages as read
    await Message.updateMany(
      { roomId, recipientId: req.user.id, readAt: null },
      { readAt: new Date() }
    );

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        roomId,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { recipientId, content } = req.body;
    if (!recipientId || !content?.trim()) {
      throw new AppError('Recipient and message content are required.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const recipient = await User.findById(recipientId).select('_id');
    if (!recipient) throw new AppError('Recipient not found.', 404, ErrorCodes.NOT_FOUND);

    const roomId = Message.getRoomId(req.user.id, recipientId);

    const [message] = await Message.create([{
      senderId: req.user.id,
      recipientId,
      content: content.trim(),
      roomId,
    }]);

    await message.populate({ path: 'senderId', select: 'firstName lastName avatar' });

    // Emit real-time message to recipient
    emitToUser(recipientId, 'message:new', message);
    emitToRoom(roomId, 'message:new', message);

    logger.info('Message sent', { senderId: req.user.id, recipientId, roomId });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
}

async function markMessagesRead(req, res, next) {
  try {
    const { partnerId } = req.params;
    const roomId = Message.getRoomId(req.user.id, partnerId);

    const result = await Message.updateMany(
      { roomId, recipientId: req.user.id, readAt: null },
      { readAt: new Date() }
    );

    // Notify the sender that messages were read
    emitToUser(partnerId, 'message:read', { roomId, readBy: req.user.id });

    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  } catch (error) {
    next(error);
  }
}

module.exports = { getConversations, getMessages, sendMessage, markMessagesRead };
