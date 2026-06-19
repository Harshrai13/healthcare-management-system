const request = require('supertest');
const app = require('../src/app');
const { DoctorProfile, Service } = require('../src/models');
require('./setup');

// Helper to register and get token
async function registerUser(overrides = {}) {
  const User = require('../src/models/User');
  const user = {
    email: overrides.email || `patient_${Date.now()}@test.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Patient',
    phone: '555-0100',
    ...overrides,
  };
  await request(app).post('/api/auth/register').send(user);
  // Mark user as verified and login to get token
  await User.updateOne({ email: user.email }, { isVerified: true });
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  return { token: loginRes.body.data.accessToken, user: loginRes.body.data.user };
}

// Helper to create a doctor
async function createDoctor() {
  const bcrypt = require('bcryptjs');
  const User = require('../src/models/User');
  const passwordHash = await bcrypt.hash('TestPass123!', 12);
  const doctorUser = await User.create({
    email: `doctor_${Date.now()}@test.com`,
    passwordHash,
    firstName: 'Dr',
    lastName: 'Smith',
    phone: '555-0200',
    role: 'DOCTOR',
  });
  const doctorProfile = await DoctorProfile.create({
    userId: doctorUser._id,
    specialty: 'General Medicine',
    bio: 'Test doctor',
    education: 'MD - Test University',
    experienceYears: 5,
    gender: 'Male',
    languages: ['English'],
    consultationModes: ['IN_PERSON', 'VIDEO'],
    isAvailable: true,
  });
  return { user: doctorUser, profile: doctorProfile };
}

// Helper to create a service
async function createService() {
  return Service.create({
    name: 'General Checkup',
    slug: `general-checkup-${Date.now()}`,
    description: 'A general health checkup',
    icon: 'stethoscope',
    isActive: true,
    sortOrder: 1,
  });
}

describe('Appointments API', () => {
  let patientToken, doctor, service;

  beforeEach(async () => {
    const { token } = await registerUser();
    patientToken = token;
    doctor = await createDoctor();
    service = await createService();
  });

  describe('POST /api/appointments', () => {
    it('should create an appointment', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: doctor.profile._id.toString(),
          serviceId: service._id.toString(),
          date: tomorrow.toISOString().split('T')[0],
          startTime: '09:00',
          consultationType: 'IN_PERSON',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should prevent double-booking same time slot', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: doctor.profile._id.toString(),
          serviceId: service._id.toString(),
          date: dateStr,
          startTime: '10:00',
          consultationType: 'IN_PERSON',
        });

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: doctor.profile._id.toString(),
          serviceId: service._id.toString(),
          date: dateStr,
          startTime: '10:00',
          consultationType: 'IN_PERSON',
        });

      expect(res.status).toBe(409);
    });

    it('should reject past dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: doctor.profile._id.toString(),
          serviceId: service._id.toString(),
          date: yesterday.toISOString().split('T')[0],
          startTime: '09:00',
          consultationType: 'IN_PERSON',
        });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .send({
          doctorId: doctor.profile._id.toString(),
          serviceId: service._id.toString(),
          date: '2099-01-01',
          startTime: '09:00',
          consultationType: 'IN_PERSON',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/appointments', () => {
    it('should return patient appointments', async () => {
      // Create an appointment first
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: doctor.profile._id.toString(),
          serviceId: service._id.toString(),
          date: tomorrow.toISOString().split('T')[0],
          startTime: '11:00',
          consultationType: 'IN_PERSON',
        });

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PUT /api/appointments/:id/cancel', () => {
    it('should cancel an appointment', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const createRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: doctor.profile._id.toString(),
          serviceId: service._id.toString(),
          date: tomorrow.toISOString().split('T')[0],
          startTime: '14:00',
          consultationType: 'IN_PERSON',
        });

      const appointmentId = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Changed my mind' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('should not cancel already cancelled appointment', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const createRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId: doctor.profile._id.toString(),
          serviceId: service._id.toString(),
          date: tomorrow.toISOString().split('T')[0],
          startTime: '15:00',
          consultationType: 'IN_PERSON',
        });

      const appointmentId = createRes.body.data._id;

      await request(app)
        .put(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'First cancel' });

      const res = await request(app)
        .put(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Second cancel' });

      expect(res.status).toBe(400);
    });
  });
});
