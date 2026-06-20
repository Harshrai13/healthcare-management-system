const twilio = require('twilio');

let twilioClient = null;

function isTwilioConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  if (!isTwilioConfigured()) {
    console.warn('Twilio not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN missing) — SMS/video disabled');
    return null;
  }

  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  return twilioClient;
}

async function generateVideoToken(identity, roomName) {
  if (!isTwilioConfigured()) {
    throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY_SID, and TWILIO_API_KEY_SECRET.');
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VideoGrant = AccessToken.VideoGrant;

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    { identity }
  );

  const videoGrant = new VideoGrant({ room: roomName });
  token.addGrant(videoGrant);

  return token.toJwt();
}

async function createVideoRoom(uniqueName) {
  const client = getTwilioClient();
  if (!client) throw new Error('Twilio is not configured.');
  const room = await client.video.v1.rooms.create({
    uniqueName,
    type: 'group-small',
    emptyRoomTimeout: 5,
    unusedRoomTimeout: 5,
  });
  return room;
}

async function sendSMS(to, body) {
  const client = getTwilioClient();
  if (!client) throw new Error('Twilio is not configured.');
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
  return message;
}

module.exports = { getTwilioClient, generateVideoToken, createVideoRoom, sendSMS, isTwilioConfigured };
