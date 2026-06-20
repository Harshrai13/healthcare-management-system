import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './hooks/useAuth';

const STAFF_ROLES = ['DOCTOR', 'SUPER_ADMIN', 'CONTENT_MANAGER', 'BILLING_STAFF', 'RECEPTIONIST'];

// Public pages
const HomePage = lazy(() => import('./features/public/HomePage'));
const AboutPage = lazy(() => import('./features/public/AboutPage'));
const ServicesPage = lazy(() => import('./features/public/ServicesPage'));
const ServiceDetailPage = lazy(() => import('./features/public/ServiceDetailPage'));
const DoctorsPage = lazy(() => import('./features/public/DoctorsPage'));
const DoctorProfilePage = lazy(() => import('./features/public/DoctorProfilePage'));
const ContactPage = lazy(() => import('./features/public/ContactPage'));
const BlogPage = lazy(() => import('./features/public/BlogPage'));
const BlogDetailPage = lazy(() => import('./features/public/BlogDetailPage'));
const FAQPage = lazy(() => import('./features/public/FAQPage'));
const ReviewsPage = lazy(() => import('./features/public/ReviewsPage'));
const CareersPage = lazy(() => import('./features/public/CareersPage'));
const PrivacyPolicyPage = lazy(() => import('./features/public/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./features/public/TermsPage'));
const NotFoundPage = lazy(() => import('./features/public/NotFoundPage'));

// Auth pages
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const VerifyEmailPage = lazy(() => import('./features/auth/VerifyEmailPage'));

// Patient dashboard pages
const PatientDashboard = lazy(() => import('./features/patient/PatientDashboard'));
const PatientAppointmentsPage = lazy(() => import('./features/patient/PatientAppointmentsPage'));
const AppointmentBooking = lazy(() => import('./features/appointments/AppointmentBooking'));
const MedicalRecordsPage = lazy(() => import('./features/patient/MedicalRecordsPage'));
const PrescriptionsPage = lazy(() => import('./features/patient/PrescriptionsPage'));
const BillingPage = lazy(() => import('./features/patient/BillingPage'));
const ProfilePage = lazy(() => import('./features/patient/ProfilePage'));
const NotificationsPage = lazy(() => import('./features/patient/NotificationsPage'));
const MessagingPage = lazy(() => import('./features/patient/MessagingPage'));
const InsurancePage = lazy(() => import('./features/patient/InsurancePage'));

// Telehealth
const TelehealthPage = lazy(() => import('./features/telehealth/TelehealthPage'));

// Doctor pages
const DoctorDashboard = lazy(() => import('./features/doctor/DoctorDashboard'));
const SchedulePage = lazy(() => import('./features/doctor/SchedulePage'));
const PatientsListPage = lazy(() => import('./features/doctor/PatientsListPage'));
const ConsultationsPage = lazy(() => import('./features/doctor/ConsultationsPage'));
const CreatePrescriptionPage = lazy(() => import('./features/doctor/CreatePrescriptionPage'));

// Admin pages
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'));
const AdminAppointmentsPage = lazy(() => import('./features/admin/AdminAppointmentsPage'));
const AdminDoctorsPage = lazy(() => import('./features/admin/AdminDoctorsPage'));
const AdminPatientsPage = lazy(() => import('./features/admin/AdminPatientsPage'));
const AdminBillingPage = lazy(() => import('./features/admin/AdminBillingPage'));
const AdminBlogPage = lazy(() => import('./features/admin/AdminBlogPage'));
const AdminReviewsPage = lazy(() => import('./features/admin/AdminReviewsPage'));
const AdminAnalyticsPage = lazy(() => import('./features/admin/AdminAnalyticsPage'));
const AdminSettingsPage = lazy(() => import('./features/admin/AdminSettingsPage'));
const AdminAuditLogsPage = lazy(() => import('./features/admin/AdminAuditLogsPage'));
const AdminLoginAsPage = lazy(() => import('./features/admin/AdminLoginAsPage'));
const AdminReportsPage = lazy(() => import('./features/admin/AdminReportsPage'));

function App() {
  const { user, isAuthenticated } = useAuth();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const staffPortalUrl = import.meta.env.VITE_STAFF_PORTAL_URL || '';

  // Redirect doctors/admins to staff portal
  useEffect(() => {
    if (isAuthenticated && STAFF_ROLES.includes(user?.role) && staffPortalUrl) {
      window.location.href = staffPortalUrl;
    }
  }, [isAuthenticated, user, staffPortalUrl]);

  // Show loading while redirecting staff users
  if (isAuthenticated && STAFF_ROLES.includes(user?.role)) {
    if (!staffPortalUrl) {
      // Staff portal URL not configured — show dashboard normally (fallback)
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-neutral-500 text-sm">Redirecting to Staff Portal...</p>
          </div>
        </div>
      );
    }
  }

  const appContent = (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/:id" element={<DoctorProfilePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogDetailPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Route>

        {/* Auth routes (no layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected patient dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PatientDashboard />} />
          <Route path="appointments" element={<PatientAppointmentsPage />} />
          <Route path="appointments/book" element={<AppointmentBooking />} />
          <Route path="records" element={<MedicalRecordsPage />} />
          <Route path="prescriptions" element={<PrescriptionsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="messages" element={<MessagingPage />} />
          <Route path="insurance" element={<InsurancePage />} />
          <Route path="telehealth/:consultationId" element={<TelehealthPage />} />
        </Route>

        {/* Public booking route (redirects to login if not authenticated) */}
        <Route
          path="/appointments/book"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AppointmentBooking />} />
        </Route>

        {/* Protected doctor routes */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allowedRoles={['DOCTOR']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="patients" element={<PatientsListPage />} />
          <Route path="consultations" element={<ConsultationsPage />} />
          <Route path="prescriptions/new" element={<CreatePrescriptionPage />} />
          <Route path="telehealth/:consultationId" element={<TelehealthPage />} />
        </Route>

        {/* Protected admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CONTENT_MANAGER', 'BILLING_STAFF', 'RECEPTIONIST']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="appointments" element={<AdminAppointmentsPage />} />
          <Route path="doctors" element={<AdminDoctorsPage />} />
          <Route path="patients" element={<AdminPatientsPage />} />
          <Route path="billing" element={<AdminBillingPage />} />
          <Route path="blog" element={<AdminBlogPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="login-as" element={<AdminLoginAsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );

  return googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{appContent}</GoogleOAuthProvider>
  ) : appContent;
}

export default App;
