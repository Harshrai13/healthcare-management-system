const bcrypt = require('bcryptjs');
const { User, DoctorProfile, Service, Appointment, Review } = require('../models');

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
    Review.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('Admin@123', 12);

  // Only create admin/staff users - no dummy patients/doctors
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

  console.log('\n  ── Admin Credentials ──');
  console.log('  Admin: admin@verdantcare.com / Admin@123');
}

module.exports = { seedDatabase };
