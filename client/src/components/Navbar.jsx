import { useState, useEffect, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Menu, X, Phone, User, Bell, LogOut, ChevronDown } from 'lucide-react';
import { setMobileMenuOpen } from '../store/uiSlice';
import { logout } from '../store/authSlice';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Services', path: '/services' },
  { name: 'Doctors', path: '/doctors' },
  { name: 'Blog', path: '/blog' },
  { name: 'Contact', path: '/contact' },
];

function Navbar() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { mobileMenuOpen } = useSelector((state) => state.ui);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [scrolled, setScrolled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(setMobileMenuOpen(false));
    setProfileDropdownOpen(false);
  };

  const dashboardPath = user?.role === 'DOCTOR' ? '/doctor/dashboard' : 
                        ['SUPER_ADMIN', 'CONTENT_MANAGER', 'BILLING_STAFF', 'RECEPTIONIST'].includes(user?.role) ? '/admin' : 
                        '/dashboard';

  return (
    <header 
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 backdrop-blur-md border-b border-neutral-200/60 shadow-nav py-2' 
          : 'bg-transparent py-4'
      }`}
    >
      <nav className="container-custom">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="VerdantCare Home">
            <img src="/logo.png" alt="VerdantCare Logo" className="h-16 md:h-20 w-auto object-contain transition-transform group-hover:scale-105" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center gap-5">

          {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* Portal quick-access button */}
                <a
                  href={dashboardPath}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 border border-primary-200 text-primary-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  {user?.role === 'DOCTOR' ? 'Doctor Portal' : 
                   ['SUPER_ADMIN','CONTENT_MANAGER','BILLING_STAFF','RECEPTIONIST'].includes(user?.role) ? 'Admin Portal' : 
                   'Patient Portal'}
                </a>

                {/* Avatar dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-3 p-1.5 pr-3 rounded-full border border-neutral-200 hover:border-primary-300 hover:shadow-sm transition-all bg-white"
                  >
                    <div className="avatar-sm bg-primary-100 text-primary-700">
                      {user?.firstName?.[0] || 'U'}
                    </div>
                    <span className="text-sm font-semibold text-neutral-700">{user?.firstName}</span>
                    <ChevronDown size={16} className="text-neutral-400" />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-dropdown border border-neutral-100 py-2 animate-scale-in origin-top-right">
                      <div className="px-4 py-3 border-b border-neutral-100 mb-2">
                        <p className="text-sm font-semibold text-neutral-900">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-[11px] font-bold">
                          {user?.role?.replace('_', ' ')}
                        </span>
                      </div>
                      <a href={dashboardPath} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                        <User size={18} /> Go to Portal
                      </a>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger-light/50 transition-colors">
                        <LogOut size={18} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost-green text-sm">
                  Log In
                </Link>
                <Link to="/register" className="btn-primary text-sm shadow-emerald">
                  Book Appointment
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            onClick={() => dispatch(setMobileMenuOpen(!mobileMenuOpen))}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-neutral-200 shadow-lg animate-fade-down origin-top">
            <div className="container-custom py-6 flex flex-col gap-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`px-4 py-3 rounded-xl font-medium text-lg transition-colors ${
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                    onClick={() => dispatch(setMobileMenuOpen(false))}
                  >
                    {link.name}
                  </Link>
                );
              })}
              
              <div className="h-px bg-neutral-200 my-4" />
              
              {isAuthenticated ? (
                <>
                  <div className="px-4 py-3 flex items-center gap-4 mb-2">
                    <div className="avatar-md bg-primary-100 text-primary-700">
                      {user?.firstName?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">{user?.firstName} {user?.lastName}</p>
                      <p className="text-sm text-neutral-500">{user?.email}</p>
                    </div>
                  </div>
                  <Link to={dashboardPath} className="btn-outline w-full justify-center" onClick={() => dispatch(setMobileMenuOpen(false))}>
                    Go to Dashboard
                  </Link>
                  <button onClick={handleLogout} className="btn-ghost text-danger w-full justify-center mt-2">
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 px-4">
                  <Link to="/login" className="btn-outline w-full justify-center" onClick={() => dispatch(setMobileMenuOpen(false))}>
                    Log In
                  </Link>
                  <Link to="/dashboard/appointments" className="btn-primary w-full justify-center" onClick={() => dispatch(setMobileMenuOpen(false))}>
                    Book Appointment
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

export default memo(Navbar);
