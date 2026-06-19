const twilio = require('twilio');

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  return twilioClient;
}

async function generateVideoToken(identity, roomName) {
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
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
  return message;
}

module.exports = { getTwilioClient, generateVideoToken, createVideoRoom, sendSMS };
