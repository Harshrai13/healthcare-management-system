const bcrypt = require('bcryptjs');
const { User, DoctorProfile, Service, Appointment } = require('../models');

const services = [
  { name: 'Family Medicine', slug: 'family-medicine', description: 'Comprehensive healthcare for patients of all ages, from routine checkups to chronic disease management.', icon: 'family', sortOrder: 1 },
  { name: 'Internal Medicine', slug: 'internal-medicine', description: 'Specialized adult healthcare focusing on prevention, diagnosis, and treatment of complex conditions.', icon: 'internal', sortOrder: 2 },
  { name: "Women's Health", slug: 'womens-health', description: 'Complete gynecological and obstetric care including prenatal, reproductive health, and wellness services.', icon: 'womens', sortOrder: 3 },
  { name: "Men's Health", slug: 'mens-health', description: 'Comprehensive men\'s healthcare including preventive screenings, hormonal health, and urological care.', icon: 'mens', sortOrder: 4 },
  { name: 'Pediatrics', slug: 'pediatrics', description: 'Expert care for infants, children, and adolescents including vaccinations and developmental assessments.', icon: 'pediatrics', sortOrder: 5 },
  { name: 'Senior Care', slug: 'senior-care', description: 'Specialized geriatric care focusing on age-related conditions, mobility, and quality of life.', icon: 'senior', sortOrder: 6 },
  { name: 'Preventive Care', slug: 'preventive-care', description: 'Proactive health screenings, immunizations, and wellness programs to prevent illness before it starts.', icon: 'preventive', sortOrder: 7 },
  { name: 'Chronic Disease Management', slug: 'chronic-disease-management', description: 'Ongoing care for diabetes, hypertension, heart disease, and other chronic conditions.', icon: 'chronic', sortOrder: 8 },
  { name: 'Vaccinations', slug: 'vaccinations', description: 'Complete immunization services for children and adults including flu shots and travel vaccines.', icon: 'vaccine', sortOrder: 9 },
  { name: 'Diagnostics', slug: 'diagnostics', description: 'Advanced diagnostic testing including lab work, imaging, and health assessments.', icon: 'diagnostics', sortOrder: 10 },
  { name: 'Telemedicine', slug: 'telemedicine', description: 'Secure video consultations with our physicians from the comfort of your home.', icon: 'telemedicine', sortOrder: 11 },
  { name: 'Wellness Programs', slug: 'wellness-programs', description: 'Personalized nutrition, fitness, and mental health programs for optimal wellbeing.', icon: 'wellness', sortOrder: 12 },
  { name: 'Urgent Care', slug: 'urgent-care', description: 'Walk-in care for non-life-threatening conditions requiring prompt medical attention.', icon: 'urgent', sortOrder: 13 },
];

const defaultSchedule = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30, isAvailable: true },
  { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDuration: 30, isAvailable: true },
  { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDuration: 30, isAvailable: true },
  { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDuration: 30, isAvailable: true },
  { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', slotDuration: 30, isAvailable: true },
];

async function seedDatabase() {
  await Promise.all([
    User.deleteMany({}),
    DoctorProfile.deleteMany({}),
    Service.deleteMany({}),
    Appointment.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const patientHash = await bcrypt.hash('Patient@123', 12);
  const doctorHash = await bcrypt.hash('Doctor@123', 12);

  const admin = await User.create({
    email: 'admin@verdantcare.com',
    passwordHash,
    firstName: 'System',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
    isVerified: true,
  });
  console.log('  Admin user created:', admin.email);

  await User.create({
    email: 'reception@verdantcare.com',
    passwordHash,
    firstName: 'Rita',
    lastName: 'Reception',
    role: 'RECEPTIONIST',
    isVerified: true,
  });

  await User.create({
    email: 'billing@verdantcare.com',
    passwordHash,
    firstName: 'Ben',
    lastName: 'Billing',
    role: 'BILLING_STAFF',
    isVerified: true,
  });

  await User.create({
    email: 'content@verdantcare.com',
    passwordHash,
    firstName: 'Clara',
    lastName: 'Content',
    role: 'CONTENT_MANAGER',
    isVerified: true,
  });

  const serviceDocs = await Service.insertMany(services);
  console.log(`  ${serviceDocs.length} services created`);

  const familyMedicine = serviceDocs.find((s) => s.slug === 'family-medicine');
  const pediatrics = serviceDocs.find((s) => s.slug === 'pediatrics');
  const telemedicine = serviceDocs.find((s) => s.slug === 'telemedicine');

  const doctors = [
    { email: 'sarah.chen@verdantcare.com', firstName: 'Sarah', lastName: 'Chen', specialty: 'Family Medicine', experienceYears: 12, rating: 4.9 },
    { email: 'james.wilson@verdantcare.com', firstName: 'James', lastName: 'Wilson', specialty: 'Pediatrics', experienceYears: 8, rating: 4.7 },
    { email: 'emily.rodriguez@verdantcare.com', firstName: 'Emily', lastName: 'Rodriguez', specialty: 'Telemedicine', experienceYears: 10, rating: 4.8 },
  ];

  const doctorProfiles = [];
  for (const doc of doctors) {
    const user = await User.create({
      email: doc.email,
      passwordHash: doctorHash,
      firstName: doc.firstName,
      lastName: doc.lastName,
      phone: '+1 (555) 100-0001',
      role: 'DOCTOR',
      isVerified: true,
    });
    const profile = await DoctorProfile.create({
      userId: user._id,
      specialty: doc.specialty,
      bio: `Dr. ${doc.lastName} is a board-certified physician with ${doc.experienceYears} years of experience at VerdantCare.`,
      education: 'MD, Board Certified',
      experienceYears: doc.experienceYears,
      consultationModes: ['IN_PERSON', 'VIDEO'],
      rating: doc.rating,
      reviewCount: 24,
      isAvailable: true,
      schedules: defaultSchedule,
    });
    doctorProfiles.push(profile);
    console.log(`  Doctor created: Dr. ${doc.firstName} ${doc.lastName}`);
  }

  const patients = [
    { email: 'john.doe@example.com', firstName: 'John', lastName: 'Doe' },
    { email: 'jane.smith@example.com', firstName: 'Jane', lastName: 'Smith' },
    { email: 'mike.johnson@example.com', firstName: 'Mike', lastName: 'Johnson' },
  ];

  const patientUsers = [];
  for (const p of patients) {
    const user = await User.create({
      email: p.email,
      passwordHash: patientHash,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: '+1 (555) 200-0001',
      role: 'PATIENT',
      isVerified: true,
    });
    patientUsers.push(user);
    console.log(`  Patient created: ${p.firstName} ${p.lastName}`);
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(0, 0, 0, 0);

  await Appointment.insertMany([
    {
      patientId: patientUsers[0]._id,
      doctorId: doctorProfiles[0]._id,
      serviceId: familyMedicine._id,
      date: tomorrow,
      startTime: '10:00',
      endTime: '10:30',
      consultationType: 'IN_PERSON',
      status: 'CONFIRMED',
    },
    {
      patientId: patientUsers[1]._id,
      doctorId: doctorProfiles[1]._id,
      serviceId: pediatrics._id,
      date: tomorrow,
      startTime: '14:00',
      endTime: '14:30',
      consultationType: 'IN_PERSON',
      status: 'PENDING',
    },
    {
      patientId: patientUsers[0]._id,
      doctorId: doctorProfiles[2]._id,
      serviceId: telemedicine._id,
      date: nextWeek,
      startTime: '11:00',
      endTime: '11:30',
      consultationType: 'VIDEO',
      status: 'CONFIRMED',
    },
  ]);
  console.log('  3 sample appointments created');

  console.log('\n  ── Demo Credentials ──');
  console.log('  Admin:    admin@verdantcare.com / Admin@123');
  console.log('  Doctor:   sarah.chen@verdantcare.com / Doctor@123');
  console.log('  Patient:  john.doe@example.com / Patient@123');
}

module.exports = { seedDatabase };
