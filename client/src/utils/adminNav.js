import {
  LayoutDashboard, Calendar, User, Users, CreditCard, BookOpen, Star,
  BarChart3, PieChart, Settings, Shield, Eye,
} from 'lucide-react';

const ALL_ADMIN_ROLES = ['SUPER_ADMIN', 'CONTENT_MANAGER', 'BILLING_STAFF', 'RECEPTIONIST'];

/** Nav items visible per admin role */
const ADMIN_NAV_BY_ROLE = {
  SUPER_ADMIN: [
    { name: 'Command Center', path: '/admin', icon: LayoutDashboard },
    { name: 'Appointments', path: '/admin/appointments', icon: Calendar },
    { name: 'Doctors', path: '/admin/doctors', icon: User },
    { name: 'Patients', path: '/admin/patients', icon: Users },
    { name: 'Billing & Revenue', path: '/admin/billing', icon: CreditCard },
    { name: 'Blog Content', path: '/admin/blog', icon: BookOpen },
    { name: 'Reviews', path: '/admin/reviews', icon: Star },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Reports', path: '/admin/reports', icon: PieChart },
    { name: 'Login As User', path: '/admin/login-as', icon: Eye },
    { name: 'System Settings', path: '/admin/settings', icon: Settings },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: Shield },
  ],
  RECEPTIONIST: [
    { name: 'Command Center', path: '/admin', icon: LayoutDashboard },
    { name: 'Appointments', path: '/admin/appointments', icon: Calendar },
    { name: 'Doctors', path: '/admin/doctors', icon: User },
    { name: 'Patients', path: '/admin/patients', icon: Users },
  ],
  BILLING_STAFF: [
    { name: 'Command Center', path: '/admin', icon: LayoutDashboard },
    { name: 'Billing & Revenue', path: '/admin/billing', icon: CreditCard },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Reports', path: '/admin/reports', icon: PieChart },
  ],
  CONTENT_MANAGER: [
    { name: 'Command Center', path: '/admin', icon: LayoutDashboard },
    { name: 'Blog Content', path: '/admin/blog', icon: BookOpen },
    { name: 'Reviews', path: '/admin/reviews', icon: Star },
  ],
};

export function isAdminRole(role) {
  return ALL_ADMIN_ROLES.includes(role);
}

export function getAdminNavItems(role) {
  return ADMIN_NAV_BY_ROLE[role] || ADMIN_NAV_BY_ROLE.RECEPTIONIST;
}

export function routeAfterLogin(user, navigate) {
  if (user.role === 'DOCTOR') navigate('/doctor/dashboard');
  else if (isAdminRole(user.role)) navigate('/admin');
  else navigate('/dashboard');
}
