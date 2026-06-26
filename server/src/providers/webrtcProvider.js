/**
 * WebRTCProvider — Built-in peer-to-peer WebRTC implementation.
 *
 * This is the default provider. It uses Socket.io for signaling
 * and relies on ICE servers configured in VideoSettings.
 *
 * No external SDK required — the browser's native RTCPeerConnection handles everything.
 */
const VideoProvider = require('./VideoProvider');

class WebRTCProvider extends VideoProvider {
  constructor() {
    super('webrtc');
  }

  /**
   * WebRTC is always configured — it uses browser-native APIs + ICE servers from DB.
   */
  async isConfigured() {
    return { configured: true };
  }

  /**
   * Return the client-side config needed to initialize a WebRTC call.
   * The frontend fetches this when opening the telehealth page.
   */
  async getClientConfig(settings) {
    const iceServers = await settings.constructor.getIceServers();
    return {
      provider: 'webrtc',
      iceServers,
      mediaConstraints: await settings.constructor.getMediaConstraints(),
      features: {
        screenSharing: settings.allowScreenSharing,
        recording: settings.allowRecording,
        waitingRoom: settings.waitingRoom,
      },
      timing: {
        autoEnd: settings.autoEndConsultation,
        maxDuration: settings.maximumDuration,
      },
      defaults: {
        startWithMutedMic: settings.startWithMutedMic,
        startWithMutedCamera: settings.startWithMutedCamera,
        videoQuality: settings.defaultVideoQuality,
      },
    };
  }

  /**
   * For WebRTC, "creating a room" just means generating a room identifier.
   * There is no server-side room — peers connect directly via Socket.io signaling.
   */
  async createRoom(consultation, settings) {
    return {
      roomId: `verdantcare-${consultation._id || consultation.appointmentId}`,
      provider: 'webrtc',
      // No token or URL needed for native WebRTC
    };
  }

  /**
   * Not applicable for native WebRTC — no token-based auth.
   * Room access is controlled by Socket.io JWT auth + server-side consultation validation.
   */
  async generateJoinToken(_roomId, _participant, _settings) {
    return { provider: 'webrtc', token: null };
  }

  /**
   * No server-side room to tear down for WebRTC.
   * Cleanup happens client-side when peers close their RTCPeerConnection.
   */
  async endRoom(_roomId, _settings) {
    // No-op for WebRTC — peers disconnect naturally
  }
}

module.exports = WebRTCProvider;
