const { z } = require('zod');

const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1').optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10').optional(),
  cursor: z.string().optional(),
});

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const appointmentSchema = z.object({
  doctorId: z.string().regex(objectIdRegex, 'Please select a valid doctor'),
  serviceId: z.string().regex(objectIdRegex, 'Please select a valid service'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please select a valid time'),
  consultationType: z.enum(['IN_PERSON', 'VIDEO'], {
    errorMap: () => ({ message: 'Please select IN_PERSON or VIDEO consultation' }),
  }),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50).optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50).optional(),
  phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number').optional(),
  avatar: z.string().url('Please enter a valid URL').optional(),
});

const reviewSchema = z.object({
  doctorId: z.string().regex(objectIdRegex, 'Please select a valid doctor').optional(),
  appointmentId: z.string().regex(objectIdRegex, 'Please select a valid appointment').optional(),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000),
});

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Please enter a valid phone number').optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

module.exports = {
  paginationSchema,
  appointmentSchema,
  updateProfileSchema,
  reviewSchema,
  contactSchema,
};
