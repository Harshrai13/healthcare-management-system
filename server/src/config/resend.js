const { Resend } = require('resend');
const EmailSettings = require('../models/EmailSettings');
const logger = require('../utils/logger');

let resendClient = null;
let cachedApiKey = null;

async function getResendApiKey() {
  // Try DB first, fallback to env
  const dbKey = await EmailSettings.getDecryptedApiKey();
  if (dbKey) return dbKey;
  return process.env.RESEND_API_KEY || null;
}

async function getSenderIdentity() {
  const settings = await EmailSettings.findOne();
  return {
    senderName: settings?.senderName || 'VerdantCare Medical Center',
    senderEmail: settings?.senderEmail || process.env.EMAIL_FROM || 'noreply@verdantcare.com',
  };
}

async function getResendClient() {
  const apiKey = await getResendApiKey();
  if (!apiKey) return null;

  if (resendClient && cachedApiKey === apiKey) return resendClient;

  resendClient = new Resend(apiKey);
  cachedApiKey = apiKey;
  return resendClient;
}

async function sendViaResend({ to, subject, html, text }) {
  const client = await getResendClient();
  if (!client) {
    return { messageId: null, emailSent: false, error: 'Resend not configured' };
  }

  const { senderName, senderEmail } = await getSenderIdentity();
  const from = senderName ? `${senderName} <${senderEmail}>` : senderEmail;

  try {
    const result = await client.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });
    logger.info('Email sent via Resend', { to, subject, messageId: result.data?.id });
    return { messageId: result.data?.id, emailSent: true, data: result.data };
  } catch (error) {
    logger.error('Resend email send failed', { to, subject, error: error.message });
    return { messageId: null, emailSent: false, error: error.message };
  }
}

async function verifyResendConnection() {
  const client = await getResendClient();
  if (!client) return { verified: false, error: 'Resend API key not configured' };

  try {
    // Try to list domains to verify the API key works
    const { data } = await client.domains.list();
    return { verified: true, domains: data || [], error: null };
  } catch (error) {
    logger.error('Resend connection verification failed', { error: error.message });
    return { verified: false, error: error.message };
  }
}

async function checkDomainVerification(senderEmail) {
  const client = await getResendClient();
  if (!client) return { verified: false, error: 'Resend not configured' };

  try {
    const domain = senderEmail.split('@')[1];
    const { data } = await client.domains.list();
    const domainRecord = (data || []).find((d) => d.name === domain);
    if (!domainRecord) return { verified: false, error: `Domain ${domain} not found in Resend. Please add and verify it in your Resend dashboard.` };
    return { verified: domainRecord.status === 'verified', domain: domainRecord, error: domainRecord.status !== 'verified' ? `Domain ${domain} is not verified in Resend.` : null };
  } catch (error) {
    return { verified: false, error: error.message };
  }
}

module.exports = { getResendClient, sendViaResend, verifyResendConnection, checkDomainVerification, getSenderIdentity, getResendApiKey };
