const EmailTemplate = require('../models/EmailTemplate');

const templates = [
  // Account Events
  {
    name: 'emailVerification',
    subject: 'Verify Your Email - VerdantCare Medical Center',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">VerdantCare Medical Center</h1>
        <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 14px;">Email Verification</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #0A4A3C;">Hi {{firstName}},</h2>
        <p style="color: #4b5563; line-height: 1.6;">Thank you for registering with VerdantCare Medical Center. Please use the verification code below to activate your account:</p>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; border: 2px dashed #0A4A3C;">
          <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0A4A3C; margin: 0;">{{otp}}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code expires in 15 minutes. If you didn't create an account, you can safely ignore this email.</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a new user registers to verify their email address',
    category: 'account',
  },
  {
    name: 'passwordReset',
    subject: 'Reset Your VerdantCare Password',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Password Reset</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{firstName}},</p>
        <p style="color: #4b5563;">We received a request to reset your password. Click the button below to create a new password. This link expires in 1 hour.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{resetLink}}" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
        </div>
        <p style="color: #9ca3af; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a user requests a password reset via email link',
    category: 'account',
  },
  {
    name: 'otpPasswordReset',
    subject: 'Your VerdantCare Password Reset Code',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Password Reset Code</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{firstName}},</p>
        <p style="color: #4b5563;">We received a request to reset your password. Use the 4-digit code below to verify your identity. This code expires in 10 minutes.</p>
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background: #f0fdf4; border: 2px solid #0A4A3C; border-radius: 12px; padding: 20px 40px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #0A4A3C; font-family: 'Courier New', monospace;">{{otp}}</span>
          </div>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">Do not share this code with anyone. VerdantCare staff will never ask for this code.</p>
        <p style="color: #9ca3af; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a user requests a password reset via OTP code',
    category: 'account',
  },
  // Appointment Events
  {
    name: 'appointmentConfirmation',
    subject: 'Appointment Confirmed - {{date}} at {{time}}',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Confirmed</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Your appointment has been confirmed. Here are the details:</p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Doctor:</strong> {{doctorName}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Service:</strong> {{service}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Date:</strong> {{date}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Time:</strong> {{time}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Type:</strong> {{type}}</p>
        </div>
        <p style="color: #4b5563;">We look forward to seeing you!</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when an appointment is confirmed by admin or doctor',
    category: 'appointment',
  },
  {
    name: 'appointmentApproved',
    subject: 'Appointment Approved - {{date}} at {{time}}',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Approved</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Your appointment request has been approved. Here are the details:</p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Doctor:</strong> {{doctorName}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Service:</strong> {{service}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Date:</strong> {{date}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Time:</strong> {{time}}</p>
        </div>
        <p style="color: #4b5563;">You can view your appointment details in your patient dashboard.</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a pending appointment is approved',
    category: 'appointment',
  },
  {
    name: 'appointmentRejected',
    subject: 'Appointment Request Rejected',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Request Rejected</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Unfortunately, your appointment request could not be approved at this time.</p>
        <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #fca5a5;">
          <p style="margin: 4px 0; color: #991b1b;"><strong>Service:</strong> {{service}}</p>
          <p style="margin: 4px 0; color: #991b1b;"><strong>Requested Date:</strong> {{date}}</p>
          {{#if reason}}<p style="margin: 4px 0; color: #991b1b;"><strong>Reason:</strong> {{reason}}</p>{{/if}}
        </div>
        <p style="color: #4b5563;">You can book a new appointment through your patient portal.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{clientUrl}}/appointments/book" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Book New Appointment</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a pending appointment request is rejected',
    category: 'appointment',
  },
  {
    name: 'appointmentReminder',
    subject: 'Reminder: Appointment Tomorrow at {{time}}',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Reminder</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">This is a friendly reminder about your upcoming appointment:</p>
        <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #fcd34d;">
          <p style="margin: 4px 0; color: #92400e;"><strong>Date:</strong> {{date}} at {{time}}</p>
          <p style="margin: 4px 0; color: #92400e;"><strong>Doctor:</strong> {{doctorName}}</p>
          <p style="margin: 4px 0; color: #92400e;"><strong>Service:</strong> {{service}}</p>
        </div>
        <p style="color: #4b5563;">If you need to reschedule, please do so at least 24 hours in advance.</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent 24 hours before an appointment as a reminder',
    category: 'appointment',
  },
  {
    name: 'appointmentCancellation',
    subject: 'Appointment Cancelled',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Cancelled</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Your appointment has been cancelled as requested.</p>
        <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #fca5a5;">
          <p style="margin: 4px 0; color: #991b1b;"><strong>Service:</strong> {{service}}</p>
          <p style="margin: 4px 0; color: #991b1b;"><strong>Original Date:</strong> {{date}} at {{time}}</p>
        </div>
        <p style="color: #4b5563;">You can book a new appointment anytime through your patient portal.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{clientUrl}}/appointments/book" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Book New Appointment</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when an appointment is cancelled',
    category: 'appointment',
  },
  {
    name: 'appointmentRescheduled',
    subject: 'Appointment Rescheduled to {{newDate}}',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Appointment Rescheduled</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Your appointment has been rescheduled. Here are your new details:</p>
        <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #fcd34d;">
          <p style="margin: 4px 0; color: #92400e;"><strong>Doctor:</strong> {{doctorName}}</p>
          <p style="margin: 4px 0; color: #92400e;"><strong>Service:</strong> {{service}}</p>
          <p style="margin: 4px 0; color: #92400e;"><strong>New Date:</strong> {{newDate}}</p>
          <p style="margin: 4px 0; color: #92400e;"><strong>New Time:</strong> {{newTime}}</p>
        </div>
        <p style="color: #4b5563;">If this new time does not work for you, please contact us or reschedule through your portal.</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when an appointment is rescheduled',
    category: 'appointment',
  },
  // Consultation Events
  {
    name: 'consultationReminder',
    subject: 'Consultation Start Reminder - {{date}} at {{time}}',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #6b21a8; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Consultation Reminder</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Your consultation is starting soon. Please be ready to join at the scheduled time.</p>
        <div style="background: #faf5ff; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #e9d5ff;">
          <p style="margin: 4px 0; color: #6b21a8;"><strong>Doctor:</strong> {{doctorName}}</p>
          <p style="margin: 4px 0; color: #6b21a8;"><strong>Date:</strong> {{date}}</p>
          <p style="margin: 4px 0; color: #6b21a8;"><strong>Time:</strong> {{time}}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{clientUrl}}/dashboard/appointments" style="background: #6b21a8; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Join Consultation</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent before a consultation starts as a reminder',
    category: 'consultation',
  },
  {
    name: 'consultationComplete',
    subject: 'Consultation Completed - Summary',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Consultation Completed</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Your consultation with Dr. {{doctorName}} has been completed. A summary of your visit is now available in your patient portal.</p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Doctor:</strong> {{doctorName}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Date:</strong> {{date}}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{clientUrl}}/dashboard/consultations" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Summary</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent after a consultation is completed with summary',
    category: 'consultation',
  },
  // Prescription Events
  {
    name: 'prescriptionIssued',
    subject: 'New Prescription Issued',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Prescription</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Dr. {{doctorName}} has issued a new prescription for you. Log into your patient portal to view the details.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{clientUrl}}/dashboard/prescriptions" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Prescription</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a new prescription is issued',
    category: 'prescription',
  },
  {
    name: 'prescriptionUpdated',
    subject: 'Prescription Updated',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Prescription Updated</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Your prescription has been updated by Dr. {{doctorName}}. Please review the changes in your patient portal.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{clientUrl}}/dashboard/prescriptions" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Updated Prescription</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a prescription is updated',
    category: 'prescription',
  },
  // Billing Events
  {
    name: 'invoiceGenerated',
    subject: 'Invoice #{{invoiceId}} Ready for Payment',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Invoice Ready</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">A new invoice has been generated for your recent visit.</p>
        <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #93c5fd;">
          <p style="margin: 4px 0; color: #1e3a5f;"><strong>Invoice #:</strong> {{invoiceId}}</p>
          <p style="margin: 4px 0; color: #1e3a5f;"><strong>Amount Due:</strong> \${{total}}</p>
          <p style="margin: 4px 0; color: #1e3a5f;"><strong>Due Date:</strong> {{dueDate}}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{clientUrl}}/dashboard/billing" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Invoice</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a new invoice is generated',
    category: 'billing',
  },
  {
    name: 'paymentSuccess',
    subject: 'Payment Successful - ${{amount}}',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Successful</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Your payment has been processed successfully.</p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #86efac;">
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Amount Paid:</strong> \${{amount}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Invoice #:</strong> {{invoiceId}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Date:</strong> {{date}}</p>
        </div>
        <p style="color: #4b5563;">A receipt has been generated and is available in your billing section.</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a payment is successfully processed',
    category: 'billing',
  },
  {
    name: 'paymentFailed',
    subject: 'Payment Failed - Action Required',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Failed</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">We were unable to process your payment. Please try again or contact us for assistance.</p>
        <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #fca5a5;">
          <p style="margin: 4px 0; color: #991b1b;"><strong>Invoice #:</strong> {{invoiceId}}</p>
          <p style="margin: 4px 0; color: #991b1b;"><strong>Amount:</strong> \${{amount}}</p>
          <p style="margin: 4px 0; color: #991b1b;"><strong>Error:</strong> {{error}}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{clientUrl}}/dashboard/billing" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Retry Payment</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a payment attempt fails',
    category: 'billing',
  },
  {
    name: 'paymentReminder',
    subject: 'Payment Reminder - Invoice #{{invoiceId}}',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Reminder</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">This is a friendly reminder that you have an outstanding invoice.</p>
        <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #fcd34d;">
          <p style="margin: 4px 0; color: #92400e;"><strong>Invoice #:</strong> {{invoiceId}}</p>
          <p style="margin: 4px 0; color: #92400e;"><strong>Amount Due:</strong> \${{total}}</p>
          <p style="margin: 4px 0; color: #92400e;"><strong>Due Date:</strong> {{dueDate}}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{clientUrl}}/dashboard/billing" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Pay Now</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent as a reminder for pending payments',
    category: 'billing',
  },
  {
    name: 'receiptGenerated',
    subject: 'Receipt for Payment - ${{amount}}',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Receipt</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">Your payment receipt is now available.</p>
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Invoice #:</strong> {{invoiceId}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Amount Paid:</strong> \${{amount}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Date:</strong> {{date}}</p>
          <p style="margin: 4px 0; color: #0A4A3C;"><strong>Method:</strong> {{method}}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{clientUrl}}/dashboard/billing" style="background: #0A4A3C; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Receipt</a>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a payment receipt is generated',
    category: 'billing',
  },
  // Follow-up Events
  {
    name: 'followupScheduled',
    subject: 'Follow-up Appointment Scheduled',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Follow-up Scheduled</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">A follow-up appointment has been scheduled for you.</p>
        <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #93c5fd;">
          <p style="margin: 4px 0; color: #1e3a5f;"><strong>Doctor:</strong> {{doctorName}}</p>
          <p style="margin: 4px 0; color: #1e3a5f;"><strong>Date:</strong> {{date}}</p>
          <p style="margin: 4px 0; color: #1e3a5f;"><strong>Time:</strong> {{time}}</p>
        </div>
        <p style="color: #4b5563;">Please be prepared to discuss your progress since the last visit.</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent when a follow-up appointment is scheduled',
    category: 'followup',
  },
  {
    name: 'followupReminder',
    subject: 'Follow-up Reminder - {{date}} at {{time}}',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Follow-up Reminder</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">This is a reminder about your upcoming follow-up appointment.</p>
        <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #fcd34d;">
          <p style="margin: 4px 0; color: #92400e;"><strong>Doctor:</strong> {{doctorName}}</p>
          <p style="margin: 4px 0; color: #92400e;"><strong>Date:</strong> {{date}} at {{time}}</p>
        </div>
        <p style="color: #4b5563;">Please bring any relevant documents or notes from your previous visit.</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent as a reminder before a follow-up appointment',
    category: 'followup',
  },
  // Clinic Announcement
  {
    name: 'clinicAnnouncement',
    subject: '{{announcementTitle}}',
    htmlBody: `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #0A4A3C; padding: 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Clinic Announcement</h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #4b5563;">Dear {{patientName}},</p>
        <p style="color: #4b5563;">{{announcementBody}}</p>
      </div>
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 VerdantCare Medical Center. All rights reserved.</p>
      </div>
    </div>`,
    description: 'Sent for clinic announcements (new services, campaigns, notices)',
    category: 'announcement',
  },
];

async function seedEmailTemplates() {
  try {
    for (const template of templates) {
      await EmailTemplate.findOneAndUpdate(
        { name: template.name },
        template,
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${templates.length} email templates`);
  } catch (error) {
    console.error('Error seeding email templates:', error.message);
  }
}

module.exports = { seedEmailTemplates, templates };
