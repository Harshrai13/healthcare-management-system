import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, accessToken } = useSelector((s) => s.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const redirectByRole = () => {
    if (!user) return navigate('/login');
    if (user.role === 'DOCTOR') navigate('/doctor/dashboard');
    else if (['SUPER_ADMIN', 'CONTENT_MANAGER', 'BILLING_STAFF', 'RECEPTIONIST'].includes(user.role)) navigate('/admin');
    else navigate('/dashboard');
  };

  const isAdmin = ['SUPER_ADMIN', 'CONTENT_MANAGER', 'BILLING_STAFF', 'RECEPTIONIST'].includes(user?.role);
  const isDoctor = user?.role === 'DOCTOR';
  const isPatient = user?.role === 'PATIENT';
  const dashboardPath = isDoctor ? '/doctor/dashboard' : isAdmin ? '/admin' : '/dashboard';

  return { user, isAuthenticated, accessToken, handleLogout, redirectByRole, isAdmin, isDoctor, isPatient, dashboardPath };
}

export default useAuth;
