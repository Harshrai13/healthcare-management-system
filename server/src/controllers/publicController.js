const { sendEmail } = require('../utils/emailService');
const logger = require('../utils/logger');
const { AppError, ErrorCodes } = require('../utils/AppError');

async function submitContact(req, res, next) {
  try {
    const { name, email, phone, subject, message } = req.body;
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'support@verdantcare.com';

    await sendEmail({
      to: supportEmail,
      subject: `[VerdantCare Contact] ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
      text: `Contact from ${name} (${email})\nSubject: ${subject}\n\n${message}`,
    });

    logger.info('Contact form submitted', { email, subject });
    res.json({ success: true, message: 'Message sent successfully. We will get back to you soon.' });
  } catch (error) {
    if (!process.env.SMTP_HOST) {
      logger.info('Contact form logged (no SMTP)', { email: req.body.email, subject: req.body.subject });
      return res.json({ success: true, message: 'Message sent successfully. We will get back to you soon.' });
    }
    next(new AppError('Failed to send message. Please try again later.', 500, ErrorCodes.INTERNAL_ERROR));
  }
}

async function submitCareerApplication(req, res, next) {
  try {
    const { name, email, phone, coverLetter, positionTitle, positionId } = req.body;
    const hrEmail = process.env.HR_EMAIL || process.env.EMAIL_FROM || 'careers@verdantcare.com';

    await sendEmail({
      to: hrEmail,
      subject: `[VerdantCare Careers] Application — ${positionTitle || 'General'}`,
      html: `
        <h2>New Job Application</h2>
        <p><strong>Position:</strong> ${positionTitle || 'Not specified'} (${positionId || 'N/A'})</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        <p><strong>Cover Letter:</strong></p>
        <p>${(coverLetter || '').replace(/\n/g, '<br>')}</p>
      `,
      text: `Application for ${positionTitle}\nFrom: ${name} (${email})\n\n${coverLetter}`,
    });

    logger.info('Career application submitted', { email, positionTitle });
    res.json({ success: true, message: 'Application submitted successfully. We will review and get back to you.' });
  } catch (error) {
    if (!process.env.SMTP_HOST) {
      logger.info('Career application logged (no SMTP)', { email, positionTitle });
      return res.json({ success: true, message: 'Application submitted successfully. We will review and get back to you.' });
    }
    next(new AppError('Failed to submit application. Please try again later.', 500, ErrorCodes.INTERNAL_ERROR));
  }
}

module.exports = { submitContact, submitCareerApplication };
