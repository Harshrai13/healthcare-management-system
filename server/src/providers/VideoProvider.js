/**
 * VideoProvider — Base interface for all video consultation providers.
 *
 * Every provider must implement these methods.
 * The factory (index.js) selects the active provider based on VideoSettings.provider.
 *
 * To add a new provider (e.g. LiveKit):
 *   1. Create livekitProvider.js implementing all methods below
 *   2. Register it in index.js providerMap
 *   3. Admin sets provider = 'livekit' in VideoSettings
 */
class VideoProvider {
  constructor(name) {
    if (new.target === VideoProvider) {
      throw new Error('VideoProvider is abstract — use a concrete implementation');
    }
    this.name = name;
  }

  /**
   * Check if this provider is properly configured and ready.
   * @returns {Promise<{configured: boolean, error?: string}>}
   */
  async isConfigured() {
    throw new Error('isConfigured() must be implemented');
  }

  /**
   * Get the client-side configuration needed to initialize a call.
   * Called when a user opens the telehealth page.
   * @param {object} settings — VideoSettings document
   * @returns {Promise<object>} — provider-specific config for the frontend
   */
  async getClientConfig(settings) {
    throw new Error('getClientConfig() must be implemented');
  }

  /**
   * Create a consultation room / session on the provider side.
   * Called when doctor starts the consultation.
   * @param {object} consultation — Consultation document
   * @param {object} settings — VideoSettings document
   * @returns {Promise<object>} — { roomId, token?, url?, ... }
   */
  async createRoom(consultation, settings) {
    throw new Error('createRoom() must be implemented');
  }

  /**
   * Generate a join token / URL for a participant.
   * @param {string} roomId
   * @param {object} participant — { userId, role, name }
   * @param {object} settings — VideoSettings document
   * @returns {Promise<object>} — { token?, url?, ... }
   */
  async generateJoinToken(roomId, participant, settings) {
    throw new Error('generateJoinToken() must be implemented');
  }

  /**
   * End / clean up a room after consultation completes.
   * @param {string} roomId
   * @param {object} settings
   * @returns {Promise<void>}
   */
  async endRoom(roomId, settings) {
    throw new Error('endRoom() must be implemented');
  }
}

module.exports = VideoProvider;
