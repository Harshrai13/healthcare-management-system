const VideoSettings = require('../models/VideoSettings');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

/**
 * GET /api/video-settings
 * Return current video settings (sensitive fields masked).
 */
async function getVideoSettings(req, res) {
  try {
    const settings = await VideoSettings.getSettings();
    const response = settings.toObject();

    // Mask encrypted fields — show whether they're configured, not the value
    if (response.turnPassword) response.turnPassword = response.turnPassword ? '••••••••' : null;
    if (response.providerApiKey) response.providerApiKey = response.providerApiKey ? '••••••••' : null;
    if (response.providerApiSecret) response.providerApiSecret = response.providerApiSecret ? '••••••••' : null;

    res.json({ success: true, data: response });
  } catch (error) {
    logger.error('Get video settings failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch video settings' });
  }
}

/**
 * PUT /api/video-settings
 * Update video settings. Masked values (••••••••) are treated as "unchanged".
 */
async function updateVideoSettings(req, res) {
  try {
    const settings = await VideoSettings.getSettings();
    const old = settings.toObject();

    const {
      enabled, provider, stunServers,
      turnServerUrl, turnUsername, turnPassword,
      providerApiKey, providerApiSecret, providerAppId, providerRegion,
      allowScreenSharing, allowRecording, waitingRoom, consultationNotesEnabled,
      autoEndConsultation, maximumDuration, reminderBeforeMinutes,
      emailNotifications, smsNotifications, pushNotifications,
      defaultVideoQuality, startWithMutedMic, startWithMutedCamera,
    } = req.body;

    // Simple fields
    if (enabled !== undefined) settings.enabled = enabled;
    if (provider !== undefined) settings.provider = provider;
    if (stunServers !== undefined) settings.stunServers = stunServers;
    if (turnServerUrl !== undefined) settings.turnServerUrl = turnServerUrl || null;
    if (turnUsername !== undefined) settings.turnUsername = turnUsername || null;
    if (turnPassword !== undefined && turnPassword !== '••••••••') settings.turnPassword = turnPassword || null;
    if (providerApiKey !== undefined && providerApiKey !== '••••••••') settings.providerApiKey = providerApiKey || null;
    if (providerApiSecret !== undefined && providerApiSecret !== '••••••••') settings.providerApiSecret = providerApiSecret || null;
    if (providerAppId !== undefined) settings.providerAppId = providerAppId || null;
    if (providerRegion !== undefined) settings.providerRegion = providerRegion || null;
    if (allowScreenSharing !== undefined) settings.allowScreenSharing = allowScreenSharing;
    if (allowRecording !== undefined) settings.allowRecording = allowRecording;
    if (waitingRoom !== undefined) settings.waitingRoom = waitingRoom;
    if (consultationNotesEnabled !== undefined) settings.consultationNotesEnabled = consultationNotesEnabled;
    if (autoEndConsultation !== undefined) settings.autoEndConsultation = autoEndConsultation;
    if (maximumDuration !== undefined) settings.maximumDuration = parseInt(maximumDuration, 10) || 60;
    if (reminderBeforeMinutes !== undefined) settings.reminderBeforeMinutes = parseInt(reminderBeforeMinutes, 10) || 15;
    if (emailNotifications !== undefined) settings.emailNotifications = emailNotifications;
    if (smsNotifications !== undefined) settings.smsNotifications = smsNotifications;
    if (pushNotifications !== undefined) settings.pushNotifications = pushNotifications;
    if (defaultVideoQuality !== undefined) settings.defaultVideoQuality = defaultVideoQuality;
    if (startWithMutedMic !== undefined) settings.startWithMutedMic = startWithMutedMic;
    if (startWithMutedCamera !== undefined) settings.startWithMutedCamera = startWithMutedCamera;

    await settings.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'VIDEO_SETTINGS_UPDATED',
      entity: 'VideoSettings',
      oldValue: { enabled: old.enabled, provider: old.provider },
      newValue: { enabled: settings.enabled, provider: settings.provider },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: settings, message: 'Video consultation settings updated' });
  } catch (error) {
    logger.error('Update video settings failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update video settings' });
  }
}

/**
 * GET /api/video-settings/ice-servers
 * Return ICE server configuration for WebRTC.
 * This is called by the frontend when initializing a video call.
 */
async function getIceServers(req, res) {
  try {
    const iceServers = await VideoSettings.getIceServers();
    res.json({ success: true, data: { iceServers } });
  } catch (error) {
    logger.error('Get ICE servers failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch ICE servers' });
  }
}

/**
 * GET /api/video-settings/client-config
 * Return non-sensitive config needed by the frontend video call UI.
 */
async function getClientConfig(req, res) {
  try {
    const settings = await VideoSettings.getSettings();
    res.json({
      success: true,
      data: {
        enabled: settings.enabled,
        provider: settings.provider,
        allowScreenSharing: settings.allowScreenSharing,
        allowRecording: settings.allowRecording,
        waitingRoom: settings.waitingRoom,
        consultationNotesEnabled: settings.consultationNotesEnabled,
        autoEndConsultation: settings.autoEndConsultation,
        maximumDuration: settings.maximumDuration,
        reminderBeforeMinutes: settings.reminderBeforeMinutes,
        defaultVideoQuality: settings.defaultVideoQuality,
        startWithMutedMic: settings.startWithMutedMic,
        startWithMutedCamera: settings.startWithMutedCamera,
      },
    });
  } catch (error) {
    logger.error('Get client config failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch config' });
  }
}

module.exports = { getVideoSettings, updateVideoSettings, getIceServers, getClientConfig };
