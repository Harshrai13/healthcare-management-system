const nodemailer = require('nodemailer');
const logger = require('./logger');
const { sendViaResend } = require('../config/resend');
const EmailLog = require('../models/EmailLog');
const EmailTemplate = require('../models/EmailTemplate');
const EmailSettings = require('../models/EmailSettings');

/**
 * Get SMTP transporter — always fresh, no caching.
 * Priority: MongoDB settings → Environment variables → null
 */
async function getTransporter() {
  // Priority 1: Database SMTP settings
  const dbConfig = await EmailSettings.getSmtpConfig();
  if (dbConfig && dbConfig.pass) {
    try {
      const transport = nodemailer.createTransport({
        host: dbConfig.host,
        port: dbConfig.port,
        secure: dbConfig.secure,
        auth: { user: dbConfig.user, pass: dbConfig.pass },
      });
      return transport;
    } catch (err) {
      logger.error('Failed to create SMTP transporter from DB config', { error: err.message });
    }
  }

  // Priority 2: Environment variables (fallback)
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    !process.env.SMTP_USER.startsWith('your-')
  ) {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      return transport;
    } catch (err) {
      logger.error('Failed to create SMTP transporter from env', { error: err.message });
    }
  }

  return null;
}

async function getSenderIdentity() {
  return await EmailSettings.getSenderIdentity();
}

async function sendEmail({ to, subject, html, text, templateName }) {
  let result;
  let transportUsed = 'none';

  // Try Resend first
  try {
    result = await sendViaResend({ to, subject, html, text });
    if (result.emailSent) {
      transportUsed = 'resend';
    }
  } catch (_) {
    // Resend failed, try SMTP fallback
  }

  // Fallback to SMTP if Resend not configured or failed
  if (!result?.emailSent) {
    const transport = await getTransporter();
    if (transport) {
      try {
        const { senderName, senderEmail } = await getSenderIdentity();
        const from = senderName ? `${senderName} <${senderEmail}>` : senderEmail;
        const info = await transport.sendMail({ from, to, subject, html, text });
        result = { messageId: info.messageId, emailSent: true };
        transportUsed = 'smtp';
      } catch (smtpErr) {
        result = { messageId: null, emailSent: false, error: smtpErr.message };
      }
    } else {
      // No transport configured — log to console only
      logger.warn('No email transport configured — email logged to console only');
      const otpMatch = html?.match(/font-size:\s*36px[^>]*>([\d\s]+)</);
      if (otpMatch && process.env.NODE_ENV !== 'production') {
        console.log('\n\n ═══════════════════════════════════════════');
        console.log(`   VERIFICATION CODE for ${to}: ${otpMatch[1].trim()}`);
        console.log('═══════════════════════════════════════════\n\n');
      }
      result = { messageId: 'dev-console-fallback', emailSent: false };
    }
  }

  // Always create EmailLog record
  try {
    await EmailLog.create({
      to,
      subject,
      templateName: templateName || null,
      status: result.emailSent ? 'sent' : 'failed',
      errorMessage: result.error || null,
      messageId: result.messageId || null,
      sentAt: result.emailSent ? new Date() : null,
    });
  } catch (logErr) {
    logger.error('Failed to create EmailLog', { error: logErr.message });
  }

  if (result.emailSent) {
    logger.info('Email sent successfully', { to, subject, messageId: result.messageId, transport: transportUsed });
  } else {
    logger.error('Email send failed', { to, subject, error: result.error });
  }

  return result;
}

const emailTemplates = {
  welcome: (data) => ({
    subject: 'Welcome to VerdantCare Medical Center',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0A4A3C; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">VerdantCare Medical Center</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #0A4A3C;">Welcome, ${typeof data === 'string' ? data : data.firstName}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">Thank you for creating an account with VerdantCare Medical Center. You can now book appointments, access your patient portal, and manage your healthcare journey all in one place.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.CLIENT_URL}/login" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Get Started</a>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  appointmentConfirmation: (data) => ({
    subject: `Appointment Confirmed - ${data.date} at ${data.time}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0A4A3C; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Confirmed</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #4b5563;">Dear ${data.patientName},</p>
          <p style="color: #4b5563;">Your appointment has been confirmed. Here are the details:</p>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <p style="margin: 4px 0; color: #0A4A3C;"><strong>Doctor:</strong> ${data.doctorName}</p>
            <p style="margin: 4px 0; color: #0A4A3C;"><strong>Service:</strong> ${data.service}</p>
            <p style="margin: 4px 0; color: #0A4A3C;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin: 4px 0; color: #0A4A3C;"><strong>Time:</strong> ${data.time}</p>
            <p style="margin: 4px 0; color: #0A4A3C;"><strong>Type:</strong> ${data.type}</p>
          </div>
          ${data.type === 'Video Consultation' ? `
          <div style="background: #faf5ff; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #e9d5ff;">
            <p style="margin: 4px 0; color: #6b21a8; font-weight: 600;">Video Consultation</p>
            <p style="margin: 4px 0; color: #6b21a8;">Your doctor will start the video call at your scheduled time. You will receive a notification when the call is ready to join.</p>
          </div>
          ` : ''}
          <p style="color: #4b5563;">We look forward to seeing you!</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  appointmentReminder: (data) => ({
    subject: `Reminder: Appointment Tomorrow at ${data.time}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0A4A3C; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Reminder</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #4b5563;">Dear ${data.patientName},</p>
          <p style="color: #4b5563;">This is a friendly reminder about your upcoming appointment:</p>
          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #fcd34d;">
            <p style="margin: 4px 0; color: #92400e;"><strong>Date:</strong> ${data.date} at ${data.time}</p>
            <p style="margin: 4px 0; color: #92400e;"><strong>Doctor:</strong> ${data.doctorName}</p>
            <p style="margin: 4px 0; color: #92400e;"><strong>Service:</strong> ${data.service}</p>
          </div>
          <p style="color: #4b5563;">If you need to reschedule, please do so at least 24 hours in advance.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  appointmentCancellation: (data) => ({
    subject: 'Appointment Cancelled',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0A4A3C; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Cancelled</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #4b5563;">Dear ${data.patientName},</p>
          <p style="color: #4b5563;">Your appointment has been cancelled as requested.</p>
          <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #fca5a5;">
            <p style="margin: 4px 0; color: #991b1b;"><strong>Service:</strong> ${data.service}</p>
            <p style="margin: 4px 0; color: #991b1b;"><strong>Original Date:</strong> ${data.date} at ${data.time}</p>
          </div>
          <p style="color: #4b5563;">You can book a new appointment anytime through your patient portal.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.CLIENT_URL}/appointments/book" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Book New Appointment</a>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  passwordReset: (data) => ({
    subject: 'Reset Your VerdantCare Password',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0A4A3C; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Password Reset</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #4b5563;">Dear ${data.firstName},</p>
          <p style="color: #4b5563;">We received a request to reset your password. Click the button below to create a new password. This link expires in 1 hour.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.resetLink}" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
          </div>
          <p style="color: #9ca3af; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  otpPasswordReset: (data) => ({
    subject: 'Your VerdantCare Password Reset Code',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0A4A3C; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Password Reset Code</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #4b5563;">Dear ${data.firstName},</p>
          <p style="color: #4b5563;">We received a request to reset your password. Use the 4-digit code below to verify your identity. This code expires in 10 minutes.</p>
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: #f0fdf4; border: 2px solid #0A4A3C; border-radius: 12px; padding: 20px 40px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #0A4A3C; font-family: 'Courier New', monospace;">${data.otp}</span>
            </div>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">Do not share this code with anyone.</p>
          <p style="color: #9ca3af; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  prescriptionIssued: (data) => ({
    subject: 'New Prescription Issued',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0A4A3C; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Prescription</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #4b5563;">Dear ${data.patientName},</p>
          <p style="color: #4b5563;">Dr. ${data.doctorName} has issued a new prescription for you. Log into your patient portal to view the details.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard/prescriptions" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Prescription</a>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  invoiceReady: (data) => ({
    subject: `Invoice #${data.invoiceId} Ready for Payment`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0A4A3C; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Invoice Ready</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #4b5563;">Dear ${data.patientName},</p>
          <p style="color: #4b5563;">A new invoice has been generated for your recent visit.</p>
          <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #93c5fd;">
            <p style="margin: 4px 0; color: #1e3a5f;"><strong>Invoice #:</strong> ${data.invoiceId}</p>
            <p style="margin: 4px 0; color: #1e3a5f;"><strong>Amount Due:</strong> $${data.total}</p>
            <p style="margin: 4px 0; color: #1e3a5f;"><strong>Due Date:</strong> ${data.dueDate}</p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard/billing" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Invoice</a>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  appointmentRescheduled: (data) => ({
    subject: `Appointment Rescheduled to ${data.newDate}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0A4A3C; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Rescheduled</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #4b5563;">Dear ${data.patientName},</p>
          <p style="color: #4b5563;">Your appointment has been rescheduled. Here are your new details:</p>
          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #fcd34d;">
            <p style="margin: 4px 0; color: #92400e;"><strong>Doctor:</strong> ${data.doctorName}</p>
            <p style="margin: 4px 0; color: #92400e;"><strong>Service:</strong> ${data.service}</p>
            <p style="margin: 4px 0; color: #92400e;"><strong>New Date:</strong> ${data.newDate}</p>
            <p style="margin: 4px 0; color: #92400e;"><strong>New Time:</strong> ${data.newTime}</p>
          </div>
          <p style="color: #4b5563;">If this new time does not work, please contact us or reschedule through your portal.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  telehealthReminder: (data) => ({
    subject: `Video Consultation Reminder - ${data.date} at ${data.time}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #6b21a8; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Video Consultation Reminder</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #4b5563;">Dear ${data.patientName},</p>
          <p style="color: #4b5563;">Your video consultation is coming up soon. Here are the details:</p>
          <div style="background: #faf5ff; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #e9d5ff;">
            <p style="margin: 4px 0; color: #6b21a8;"><strong>Doctor:</strong> ${data.doctorName}</p>
            <p style="margin: 4px 0; color: #6b21a8;"><strong>Service:</strong> ${data.service}</p>
            <p style="margin: 4px 0; color: #6b21a8;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin: 4px 0; color: #6b21a8;"><strong>Time:</strong> ${data.time}</p>
          </div>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #86efac;">
            <p style="margin: 4px 0; color: #0A4A3C; font-weight: 600;">How to join:</p>
            <p style="margin: 4px 0; color: #0A4A3C;">1. Log into your patient dashboard</p>
            <p style="margin: 4px 0; color: #0A4A3C;">2. Go to "My Appointments"</p>
            <p style="margin: 4px 0; color: #0A4A3C;">3. Click "Join Call" when your doctor starts the session</p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard/appointments" style="background: #6b21a8; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to My Appointments</a>
          </div>
          <p style="color: #9ca3af; font-size: 13px;">Make sure you have a stable internet connection and your camera/microphone are working.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  emailVerification: (data) => ({
    subject: 'Verify Your Email - VerdantCare Medical Center',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: #0A4A3C; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">VerdantCare Medical Center</h1>
          <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 14px;">Email Verification</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #0A4A3C;">Hi ${data.firstName},</h2>
          <p style="color: #4b5563; line-height: 1.6;">Thank you for registering. Use the code below to verify your account:</p>
          <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; border: 2px dashed #0A4A3C;">
            <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0A4A3C; margin: 0;">${data.otp}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 15 minutes.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  appointmentApproved: (data) => ({
    subject: `Appointment Approved - ${data.date}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#0A4A3C;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Appointment Approved</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">Your appointment has been approved.</p><div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:16px 0;"><p style="margin:4px 0;color:#0A4A3C;"><strong>Doctor:</strong> ${data.doctorName}</p><p style="margin:4px 0;color:#0A4A3C;"><strong>Service:</strong> ${data.service}</p><p style="margin:4px 0;color:#0A4A3C;"><strong>Date:</strong> ${data.date} at ${data.time}</p></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  appointmentRejected: (data) => ({
    subject: 'Appointment Request Update',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#991b1b;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Appointment Request Update</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">Unfortunately, your appointment request for ${data.date} could not be approved. ${data.reason ? 'Reason: ' + data.reason : ''}</p><p style="color:#4b5563;">Please book a new appointment through your portal.</p><div style="text-align:center;margin:24px 0;"><a href="${data.clientUrl}/appointments/book" style="background:#0A4A3C;color:#fff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;">Book New Appointment</a></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  consultationReminder: (data) => ({
    subject: `Consultation Starting Soon - ${data.date}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#6b21a8;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Consultation Starting Soon</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">Your consultation with ${data.doctorName} is starting soon.</p><div style="background:#faf5ff;border-radius:8px;padding:20px;margin:16px 0;"><p style="margin:4px 0;color:#6b21a8;"><strong>Date:</strong> ${data.date}</p><p style="margin:4px 0;color:#6b21a8;"><strong>Time:</strong> ${data.time}</p></div><div style="text-align:center;margin:24px 0;"><a href="${data.clientUrl}/dashboard/appointments" style="background:#6b21a8;color:#fff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;">Go to Dashboard</a></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  consultationComplete: (data) => ({
    subject: 'Consultation Completed',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#0A4A3C;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Consultation Completed</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">Your consultation with ${data.doctorName} on ${data.date} has been completed. A summary is available in your portal.</p><div style="text-align:center;margin:24px 0;"><a href="${data.clientUrl}/dashboard" style="background:#0A4A3C;color:#fff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;">Go to Dashboard</a></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  consultationStarted: (data) => ({
    subject: 'Your Consultation is Ready — Join Now',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#059669;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Join Your Consultation</h1></div><div style="padding:32px;"><p style="color:#4b5563;">${data.patientName ? 'Dear ' + data.patientName + ',' : 'Hi there,'}</p><p style="color:#4b5563;font-size:18px;font-weight:600;">${data.doctorName} has started your video consultation. Click below to join now.</p><div style="text-align:center;margin:24px 0;"><a href="${data.clientUrl}/dashboard/telehealth/${data.consultationId}" style="background:#059669;color:#fff;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">Join Consultation</a></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  prescriptionUpdated: (data) => ({
    subject: 'Prescription Updated',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#0A4A3C;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Prescription Updated</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">Dr. ${data.doctorName} has updated your prescription. Log into your portal to view the changes.</p><div style="text-align:center;margin:24px 0;"><a href="${data.clientUrl}/dashboard/prescriptions" style="background:#0A4A3C;color:#fff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;">View Prescription</a></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  invoiceGenerated: (data) => ({
    subject: `Invoice #${data.invoiceId} Generated`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#0A4A3C;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Invoice Generated</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">A new invoice has been generated.</p><div style="background:#eff6ff;border-radius:8px;padding:20px;margin:16px 0;"><p style="margin:4px 0;color:#1e3a5f;"><strong>Invoice #:</strong> ${data.invoiceId}</p><p style="margin:4px 0;color:#1e3a5f;"><strong>Amount:</strong> $${data.total}</p><p style="margin:4px 0;color:#1e3a5f;"><strong>Due:</strong> ${data.dueDate}</p></div><div style="text-align:center;margin:24px 0;"><a href="${data.clientUrl}/dashboard/billing" style="background:#0A4A3C;color:#fff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;">View Invoice</a></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  paymentSuccess: (data) => ({
    subject: 'Payment Successful',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#059669;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Payment Successful</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">Your payment of <strong>$${data.amount}</strong> has been processed successfully.</p><div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:16px 0;"><p style="margin:4px 0;color:#0A4A3C;"><strong>Invoice:</strong> #${data.invoiceId}</p><p style="margin:4px 0;color:#0A4A3C;"><strong>Date:</strong> ${data.date}</p></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  paymentFailed: (data) => ({
    subject: 'Payment Failed',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#991b1b;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Payment Failed</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">Your payment attempt for invoice #${data.invoiceId} ($${data.amount}) failed. ${data.error ? 'Error: ' + data.error : 'Please try again.'}</p><div style="text-align:center;margin:24px 0;"><a href="${data.clientUrl}/dashboard/billing" style="background:#0A4A3C;color:#fff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;">Retry Payment</a></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  paymentReminder: (data) => ({
    subject: `Payment Reminder - Invoice #${data.invoiceId}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#d97706;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Payment Reminder</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">You have an outstanding invoice.</p><div style="background:#fffbeb;border-radius:8px;padding:20px;margin:16px 0;"><p style="margin:4px 0;color:#92400e;"><strong>Invoice:</strong> #${data.invoiceId}</p><p style="margin:4px 0;color:#92400e;"><strong>Amount:</strong> $${data.total}</p><p style="margin:4px 0;color:#92400e;"><strong>Due:</strong> ${data.dueDate}</p></div><div style="text-align:center;margin:24px 0;"><a href="${data.clientUrl}/dashboard/billing" style="background:#0A4A3C;color:#fff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;">Pay Now</a></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  receiptGenerated: (data) => ({
    subject: `Receipt for $${data.amount}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#0A4A3C;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Payment Receipt</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">A receipt for your payment has been generated.</p><div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:16px 0;"><p style="margin:4px 0;color:#0A4A3C;"><strong>Amount:</strong> $${data.amount}</p><p style="margin:4px 0;color:#0A4A3C;"><strong>Invoice:</strong> #${data.invoiceId}</p><p style="margin:4px 0;color:#0A4A3C;"><strong>Date:</strong> ${data.date}</p><p style="margin:4px 0;color:#0A4A3C;"><strong>Method:</strong> ${data.method}</p></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  followupScheduled: (data) => ({
    subject: `Follow-up Scheduled - ${data.date}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#0A4A3C;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Follow-up Scheduled</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">A follow-up appointment has been scheduled with ${data.doctorName}.</p><div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:16px 0;"><p style="margin:4px 0;color:#0A4A3C;"><strong>Date:</strong> ${data.date} at ${data.time}</p></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  followupReminder: (data) => ({
    subject: `Follow-up Reminder - ${data.date}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#d97706;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Follow-up Reminder</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">Reminder: Your follow-up with ${data.doctorName} is on ${data.date} at ${data.time}.</p></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  clinicAnnouncement: (data) => ({
    subject: data.announcementTitle || 'Announcement',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#0A4A3C;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">${data.announcementTitle || 'Announcement'}</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">${data.announcementBody || ''}</p></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),

  medicalRecordCreated: (data) => ({
    subject: 'New Medical Record Available',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;"><div style="background:#0A4A3C;padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;">Medical Record Updated</h1></div><div style="padding:32px;"><p style="color:#4b5563;">Dear ${data.patientName},</p><p style="color:#4b5563;">A new medical record has been added to your account. Log into your portal to view it.</p><div style="text-align:center;margin:24px 0;"><a href="${data.clientUrl}/dashboard/records" style="background:#0A4A3C;color:#fff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;">View Records</a></div></div><div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#6b7280;font-size:12px;margin:0;">&copy; 2026 VerdantCare Medical Center.</p></div></div>`,
  }),
};

async function sendTemplateEmail(to, templateName, data) {
  // Check DB for custom template first
  let emailContent;
  try {
    const dbTemplate = await EmailTemplate.findOne({ name: templateName, isActive: true });
    if (dbTemplate) {
      let subject = dbTemplate.subject;
      let html = dbTemplate.htmlBody;
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subject = subject.replace(regex, value);
          html = html.replace(regex, value);
        });
      }
      emailContent = { subject, html };
    } else {
      const template = emailTemplates[templateName];
      if (!template) {
        logger.error('Email template not found', { templateName });
        return { emailSent: false, error: 'Template not found' };
      }
      emailContent = typeof template === 'function' ? template(data) : template;
    }
  } catch (dbErr) {
    const template = emailTemplates[templateName];
    if (!template) {
      logger.error('Email template not found', { templateName });
      return { emailSent: false, error: 'Template not found' };
    }
    emailContent = typeof template === 'function' ? template(data) : template;
  }

  return await sendEmail({ to, templateName, ...emailContent });
}

async function sendTestEmail(to) {
  const { senderName, senderEmail } = await getSenderIdentity();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #0A4A3C;">Test Email from VerdantCare</h2>
      <p style="color: #4b5563;">This is a test email to verify your email configuration.</p>
      <p style="color: #4b5563;">Sender: ${senderName} &lt;${senderEmail}&gt;</p>
      <p style="color: #4b5563;">Sent at: ${new Date().toLocaleString()}</p>
      <p style="color: #0A4A3C; font-weight: 600;">If you received this email, your email service is working correctly!</p>
    </div>
  `;
  return await sendEmail({
    to,
    subject: 'VerdantCare Test Email',
    html,
    templateName: 'test_email',
  });
}

module.exports = { sendEmail, sendTemplateEmail, sendTestEmail, emailTemplates, getSenderIdentity };
