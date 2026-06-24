const EmailTemplate = require('../models/EmailTemplate');
const ActivityLog = require('../models/ActivityLog');
const { sendTemplateEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * Get all email templates
 */
async function getTemplates(req, res) {
  try {
    const { category, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const templates = await EmailTemplate.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Get email templates failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch email templates' });
  }
}

/**
 * Get single template
 */
async function getTemplate(req, res) {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch template' });
  }
}

/**
 * Update template
 */
async function updateTemplate(req, res) {
  try {
    const { subject, htmlBody, description, isActive } = req.body;
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const oldValue = { subject: template.subject, htmlBody: template.htmlBody };

    if (subject !== undefined) template.subject = subject;
    if (htmlBody !== undefined) template.htmlBody = htmlBody;
    if (description !== undefined) template.description = description;
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'TEMPLATE_UPDATED',
      entity: 'EmailTemplate',
      entityId: template._id.toString(),
      oldValue,
      newValue: { subject, htmlBody, description, isActive },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: template, message: 'Template updated successfully' });
  } catch (error) {
    logger.error('Update template failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
}

/**
 * Preview template with sample data
 */
async function previewTemplate(req, res) {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const sampleData = req.body.sampleData || {
      firstName: 'John',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      service: 'General Consultation',
      date: 'June 25, 2026',
      time: '10:00 AM',
      otp: '123456',
      resetLink: `${process.env.CLIENT_URL}/reset-password?token=sample`,
      invoiceId: 'INV-12345',
      total: '150.00',
      dueDate: 'June 30, 2026',
      amount: '150.00',
      announcementTitle: 'New Service Available',
      announcementBody: 'We are excited to announce a new service at our clinic.',
      clientUrl: process.env.CLIENT_URL,
    };

    let subject = template.subject;
    let html = template.htmlBody;

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value);
      html = html.replace(regex, value);
    });

    res.json({ success: true, data: { subject, html } });
  } catch (error) {
    logger.error('Preview template failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to preview template' });
  }
}

/**
 * Send test email for template
 */
async function sendTestTemplate(req, res) {
  try {
    const { to, sampleData } = req.body;
    if (!to) return res.status(400).json({ success: false, message: 'Recipient email is required' });

    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const data = sampleData || {
      firstName: 'John',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      service: 'General Consultation',
      date: 'June 25, 2026',
      time: '10:00 AM',
      clientUrl: process.env.CLIENT_URL,
    };

    const result = await sendTemplateEmail(to, template.name, data);

    await ActivityLog.create({
      userId: req.user._id,
      action: 'TEMPLATE_TEST_EMAIL_SENT',
      entity: 'EmailTemplate',
      entityId: template._id.toString(),
      newValue: { to, templateName: template.name },
      ipAddress: req.ip,
    });

    res.json({ success: result.emailSent, message: result.emailSent ? 'Test email sent' : `Failed: ${result.error}` });
  } catch (error) {
    logger.error('Send test template failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to send test email' });
  }
}

module.exports = { getTemplates, getTemplate, updateTemplate, previewTemplate, sendTestTemplate };
