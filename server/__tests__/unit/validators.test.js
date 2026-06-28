const {
  appointmentSchema,
  updateProfileSchema,
  reviewSchema,
  contactSchema,
} = require('../../src/validators/commonValidator');

describe('Validators — Unit Tests', () => {
  describe('appointmentSchema', () => {
    const validAppointment = {
      doctorId: '507f1f77bcf86cd799439011',
      serviceId: '507f1f77bcf86cd799439012',
      date: '2025-01-15',
      startTime: '09:00',
      consultationType: 'IN_PERSON',
    };

    it('should accept a valid appointment', () => {
      const result = appointmentSchema.safeParse(validAppointment);
      expect(result.success).toBe(true);
    });

    it('should accept VIDEO consultation type', () => {
      const result = appointmentSchema.safeParse({ ...validAppointment, consultationType: 'VIDEO' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid consultation type', () => {
      const result = appointmentSchema.safeParse({ ...validAppointment, consultationType: 'PHONE' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid doctorId (non-objectId)', () => {
      const result = appointmentSchema.safeParse({ ...validAppointment, doctorId: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = appointmentSchema.safeParse({ ...validAppointment, date: '15-01-2025' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid time format', () => {
      const result = appointmentSchema.safeParse({ ...validAppointment, startTime: '9:00' });
      expect(result.success).toBe(false);
    });

    it('should accept optional notes within limit', () => {
      const result = appointmentSchema.safeParse({ ...validAppointment, notes: 'Some notes' });
      expect(result.success).toBe(true);
    });

    it('should reject notes exceeding 500 chars', () => {
      const result = appointmentSchema.safeParse({ ...validAppointment, notes: 'a'.repeat(501) });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should accept valid profile update', () => {
      const result = updateProfileSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
      });
      expect(result.success).toBe(true);
    });

    it('should reject firstName shorter than 2 chars', () => {
      const result = updateProfileSchema.safeParse({ firstName: 'J' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid phone format', () => {
      const result = updateProfileSchema.safeParse({ phone: 'abc' });
      expect(result.success).toBe(false);
    });

    it('should accept empty object (all optional)', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('reviewSchema', () => {
    it('should accept valid review', () => {
      const result = reviewSchema.safeParse({
        rating: 5,
        comment: 'Great doctor, very helpful and professional.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject rating below 1', () => {
      const result = reviewSchema.safeParse({ rating: 0, comment: 'Some comment here.' });
      expect(result.success).toBe(false);
    });

    it('should reject rating above 5', () => {
      const result = reviewSchema.safeParse({ rating: 6, comment: 'Some comment here.' });
      expect(result.success).toBe(false);
    });

    it('should reject comment shorter than 10 chars', () => {
      const result = reviewSchema.safeParse({ rating: 5, comment: 'short' });
      expect(result.success).toBe(false);
    });

    it('should reject comment exceeding 1000 chars', () => {
      const result = reviewSchema.safeParse({ rating: 5, comment: 'a'.repeat(1001) });
      expect(result.success).toBe(false);
    });
  });

  describe('contactSchema', () => {
    it('should accept valid contact form', () => {
      const result = contactSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Appointment inquiry',
        message: 'I would like to schedule an appointment.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = contactSchema.safeParse({
        name: 'John',
        email: 'not-an-email',
        subject: 'Subject',
        message: 'Message here',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 chars', () => {
      const result = contactSchema.safeParse({
        name: 'J',
        email: 'john@example.com',
        subject: 'Subject',
        message: 'Message here',
      });
      expect(result.success).toBe(false);
    });

    it('should reject message shorter than 5 chars', () => {
      const result = contactSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        subject: 'Subject',
        message: 'Hi',
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty phone field', () => {
      const result = contactSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        subject: 'Subject',
        message: 'Message here',
        phone: '',
      });
      expect(result.success).toBe(true);
    });
  });
});
