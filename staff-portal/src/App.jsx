import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

import DashboardLayout from '@/layouts/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';

// ── Auth pages (shared from patient portal source via alias) ────────────────
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/VerifyEmailPage'));

// ── Doctor pages ─────────────────────────────────────────────────────────────
const DoctorDashboard = lazy(() => import('@/features/doctor/DoctorDashboard'));
const SchedulePage = lazy(() => import('@/features/doctor/SchedulePage'));
const PatientsListPage = lazy(() => import('@/features/doctor/PatientsListPage'));
const ConsultationsPage = lazy(() => import('@/features/doctor/ConsultationsPage'));
const CreatePrescriptionPage = lazy(() => import('@/features/doctor/CreatePrescriptionPage'));
const DoctorBillingPage = lazy(() => import('@/features/doctor/DoctorBillingPage'));
const DoctorProfilePage = lazy(() => import('@/features/doctor/DoctorProfilePage'));

// ── Telehealth (shared) ─────────────────────────────────────────────────────
const TelehealthPage = lazy(() => import('@/features/telehealth/TelehealthPage'));

// ── Admin pages ──────────────────────────────────────────────────────────────
const AdminDashboard = lazy(() => import('@/features/admin/AdminDashboard'));
const AdminAppointmentsPage = lazy(() => import('@/features/admin/AdminAppointmentsPage'));
const AdminDoctorsPage = lazy(() => import('@/features/admin/AdminDoctorsPage'));
const AdminPatientsPage = lazy(() => import('@/features/admin/AdminPatientsPage'));
const AdminBillingPage = lazy(() => import('@/features/admin/AdminBillingPage'));
const AdminBlogPage = lazy(() => import('@/features/admin/AdminBlogPage'));
const AdminReviewsPage = lazy(() => import('@/features/admin/AdminReviewsPage'));
const AdminAnalyticsPage = lazy(() => import('@/features/admin/AdminAnalyticsPage'));
const AdminSettingsPage = lazy(() => import('@/features/admin/AdminSettingsPage'));
const AdminAuditLogsPage = lazy(() => import('@/features/admin/AdminAuditLogsPage'));
const AdminLoginAsPage = lazy(() => import('@/features/admin/AdminLoginAsPage'));
const AdminReportsPage = lazy(() => import('@/features/admin/AdminReportsPage'));
const CommunicationDashboard = lazy(() => import('@/features/admin/communication/CommunicationDashboard'));
const EmailManagement = lazy(() => import('@/features/admin/communication/EmailManagement'));
const SMSManagement = lazy(() => import('@/features/admin/communication/SMSManagement'));
const EmailProviderSettings = lazy(() => import('@/features/admin/communication/EmailProviderSettings'));
const EmailTemplates = lazy(() => import('@/features/admin/communication/EmailTemplates'));
const Announcements = lazy(() => import('@/features/admin/communication/Announcements'));
const CommunicationAnalytics = lazy(() => import('@/features/admin/communication/CommunicationAnalytics'));
const VideoConsultationSettings = lazy(() => import('@/features/admin/video/VideoConsultationSettings'));

const STAFF_ROLES = ['DOCTOR', 'SUPER_ADMIN', 'CONTENT_MANAGER', 'BILLING_STAFF', 'RECEPTIONIST'];
const ADMIN_ROLES = ['SUPER_ADMIN', 'CONTENT_MANAGER', 'BILLING_STAFF', 'RECEPTIONIST'];

function StaffApp() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const patientPortalUrl = import.meta.env.VITE_PATIENT_PORTAL_URL || '';

  // Redirect patients away from staff portal to patient portal
  useEffect(() => {
    if (isAuthenticated && user?.role === 'PATIENT' && patientPortalUrl) {
      window.location.href = patientPortalUrl;
    }
  }, [isAuthenticated, user, patientPortalUrl]);

  // Show loading while redirecting patients
  if (isAuthenticated && user?.role === 'PATIENT') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-neutral-500 text-sm">Redirecting to Patient Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* ── Auth routes ─────────────────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* ── Doctor routes ───────────────────────────────────────────────── */}
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
          <Route path="billing" element={<DoctorBillingPage />} />
          <Route path="profile" element={<DoctorProfilePage />} />
          <Route path="telehealth/:consultationId" element={<TelehealthPage />} />
        </Route>

        {/* ── Admin routes ────────────────────────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
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
          <Route path="communication" element={<CommunicationDashboard />} />
          <Route path="communication/emails" element={<EmailManagement />} />
          <Route path="communication/sms" element={<SMSManagement />} />
          <Route path="communication/settings" element={<EmailProviderSettings />} />
          <Route path="communication/templates" element={<EmailTemplates />} />
          <Route path="communication/announcements" element={<Announcements />} />
          <Route path="communication/analytics" element={<CommunicationAnalytics />} />
          <Route path="video-consultation" element={<VideoConsultationSettings />} />
        </Route>

        {/* ── Root redirect: send staff users to their dashboard ─────────── */}
        <Route path="/" element={
          isAuthenticated
            ? <Navigate to={user?.role === 'DOCTOR' ? '/doctor/dashboard' : '/admin'} replace />
            : <Navigate to="/login" replace />
        } />

        {/* ── Catch-all: redirect to root ─────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  return googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>
      <StaffApp />
    </GoogleOAuthProvider>
  ) : <StaffApp />;
}

export default App;
