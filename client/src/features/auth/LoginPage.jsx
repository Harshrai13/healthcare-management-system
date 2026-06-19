import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { setCredentials } from '../../store/authSlice';
import { authAPI } from '../../api/authAPI';
import { routeAfterLogin } from '../../utils/adminNav';

function GoogleSignInButton({ onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    try {
      await onSuccess(credentialResponse);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    toast.error('Google sign-in was cancelled or failed.');
  };

  const googleLogin = useGoogleLogin({ onSuccess: handleSuccess, onError: handleError });

  return (
    <button
      type="button"
      onClick={() => googleLogin()}
      disabled={isLoading}
      className="btn-outline border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 w-full flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <><div className="spinner border-t-primary-600 border-2 w-5 h-5" /> Signing in with Google...</>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          Continue with Google
        </>
      )}
    </button>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  const finishLogin = (user, accessToken) => {
    dispatch(setCredentials({ user, accessToken }));
    toast.success('Welcome back!');
    routeAfterLogin(user, navigate);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await authAPI.googleAuth(credentialResponse.credential);
      const { user, accessToken } = response.data.data;
      finishLogin(user, accessToken);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Google sign-in failed. Please try again.');
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await authAPI.login(formData);
      const data = response.data.data;

      if (data.requires2FA) {
        setTwoFAToken(data.twoFAToken);
        setRequires2FA(true);
        toast('Enter your authenticator code to continue.', { icon: '🔐' });
        return;
      }

      finishLogin(data.user, data.accessToken);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (twoFACode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authAPI.verify2FALogin({ twoFAToken, code: twoFACode });
      const { user, accessToken } = response.data.data;
      finishLogin(user, accessToken);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-neutral-50">
      
      {/* Left Branding Panel (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-forest-gradient text-white overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-hero-pattern opacity-30 mix-blend-overlay pointer-events-none" />
        
        {/* Floating blobs */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-20 -right-20 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group mb-16">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <span className="text-white font-display font-bold text-2xl">V</span>
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-tight text-white">VerdantCare</h1>
              <p className="text-[10px] font-bold text-primary-300 tracking-widest uppercase mt-0.5">MEDICAL CENTER</p>
            </div>
          </Link>

          <h2 className="text-4xl lg:text-5xl font-display font-bold leading-tight mb-6">
            Premium Healthcare<br />at Your Fingertips.
          </h2>
          
          <ul className="space-y-4 mb-12">
            {[
              'Book appointments instantly with top specialists',
              'Access your complete medical records securely',
              'Connect via high-quality video consultations'
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-primary-100/90 text-lg">
                <div className="w-6 h-6 rounded-full bg-primary-500/30 flex items-center justify-center shrink-0 border border-primary-500/50">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 card-glass-dark max-w-md">
          <div className="flex gap-1 text-amber-400 mb-3">
            {[1,2,3,4,5].map(i => <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
          </div>
          <p className="text-white/90 italic mb-4">"The VerdantCare portal makes managing my family's health incredibly easy. The doctors are top-notch and the telemedicine feature is a lifesaver."</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-700 border-2 border-white/20 flex items-center justify-center font-bold text-sm">JS</div>
            <div>
              <p className="font-semibold text-sm">Jessica Smith</p>
              <p className="text-xs text-primary-300">Patient since 2022</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="w-full max-w-md animate-fade-in">
          
          <div className="lg:hidden text-center mb-10">
            <div className="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center shadow-emerald mx-auto mb-4">
              <span className="text-white font-display font-bold text-2xl">V</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-neutral-900">VerdantCare</h1>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-display font-bold text-neutral-900 mb-2">
              {requires2FA ? 'Two-Factor Authentication' : 'Welcome Back'}
            </h2>
            <p className="text-neutral-500">
              {requires2FA ? 'Enter the 6-digit code from your authenticator app.' : 'Please enter your details to sign in.'}
            </p>
          </div>

          {!requires2FA && googleClientId && <GoogleSignInButton onSuccess={handleGoogleSuccess} />}

          {!requires2FA && (
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-4 bg-neutral-50 text-neutral-400 font-medium">Or continue with</span></div>
          </div>
          )}

          {requires2FA ? (
            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div>
                <label htmlFor="twoFACode" className="label">Authentication Code</label>
                <input
                  id="twoFACode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary btn-xl w-full mt-4">
                {isSubmitting ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button type="button" onClick={() => { setRequires2FA(false); setTwoFACode(''); setTwoFAToken(''); }} className="w-full text-sm text-neutral-500 hover:text-neutral-700">
                Back to login
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`input-field pl-11 ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="error-msg"><AlertCircle size={14} /> {errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`input-field pl-11 pr-11 ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="error-msg"><AlertCircle size={14} /> {errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between mt-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5 rounded border border-neutral-300 bg-white group-hover:border-primary-500 transition-colors">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="absolute inset-0 bg-primary-500 rounded opacity-0 peer-checked:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
                <span className="text-sm font-medium text-neutral-600 select-none">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary btn-xl w-full mt-8">
              {isSubmitting ? (
                <span className="flex items-center gap-2"><div className="spinner border-t-white border-2 w-5 h-5" /> Signing in...</span>
              ) : (
                <span className="flex items-center gap-2">Sign In <LogIn size={18} /></span>
              )}
            </button>
          </form>
          )}

          {!requires2FA && (
          <p className="text-center text-neutral-600 mt-8 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 transition-colors">
              Sign up for free
            </Link>
          </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
