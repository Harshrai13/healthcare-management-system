/**
 * Video Provider Factory
 *
 * Returns the correct video provider instance based on VideoSettings.provider.
 * Reads the provider name from the database each time to support live switching.
 *
 * To add a new provider:
 *   1. Create the implementation file (e.g. livekitProvider.js)
 *   2. Import it below
 *   3. Add it to the providerMap
 */
const VideoSettings = require('../models/VideoSettings');
const WebRTCProvider = require('./webrtcProvider');

// ── Provider registry ─────────────────────────────────────────────────────────
const providerMap = {
  webrtc: new WebRTCProvider(),
  // livekit:  new LiveKitProvider(),   // future
  // twilio:   new TwilioProvider(),    // future
  // agora:   new AgoraProvider(),     // future
};

/**
 * Get the currently active video provider.
 * Reads VideoSettings.provider from DB to determine which provider to use.
 * Falls back to 'webrtc' if no settings exist or provider is unrecognized.
 *
 * @returns {Promise<import('./VideoProvider')>}
 */
async function getActiveProvider() {
  try {
    const settings = await VideoSettings.getSettings();
    const providerName = settings.provider || 'webrtc';
    return providerMap[providerName] || providerMap.webrtc;
  } catch {
    return providerMap.webrtc;
  }
}

/**
 * Get a provider instance by name (useful for admin checks).
 * @param {string} name
 * @returns {import('./VideoProvider')|null}
 */
function getProviderByName(name) {
  return providerMap[name] || null;
}

/**
 * List all available provider names.
 */
function getAvailableProviders() {
  return Object.keys(providerMap);
}

module.exports = {
  getActiveProvider,
  getProviderByName,
  getAvailableProviders,
};
