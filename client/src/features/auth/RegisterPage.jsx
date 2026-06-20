import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, UserPlus, AlertCircle, Eye, EyeOff, User, Phone, CheckCircle2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '', 
    password: '', 
    confirmPassword: '',
    role: 'PATIENT' // Default role
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else {
      if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      else if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Password must contain at least one uppercase letter';
      else if (!/[a-z]/.test(formData.password)) newErrors.password = 'Password must contain at least one lowercase letter';
      else if (!/[0-9]/.test(formData.password)) newErrors.password = 'Password must contain at least one number';
      else if (!/[^A-Za-z0-9]/.test(formData.password)) newErrors.password = 'Password must contain at least one special character';
    }
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!acceptedTerms) newErrors.terms = 'You must accept the terms and conditions';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role
      };
      // Only send phone if it has a value (empty string fails backend validation)
      if (formData.phone.trim()) {
        payload.phone = formData.phone.trim();
      }
      const response = await api.post('/auth/register', payload);
      
      // DEV ONLY: Show OTP from response for testing
      if (response.data?.devOtp) {
        toast.success(`Verification code: ${response.data.devOtp}`, { duration: 10000 });
      } else if (response.data?.emailSent === false) {
        toast('Account created but email could not be sent. Please contact support or check Render SMTP settings.', { icon: '⚠️', duration: 8000 });
      } else {
        toast.success('Account created! Please check your email for the verification code.');
      }
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (error) {
      const data = error.response?.data;
      // Map backend field-level validation errors to the form
      if (data?.errors && Array.isArray(data.errors)) {
        const fieldErrors = {};
        data.errors.forEach((err) => {
          const field = err.field === 'firstName' ? 'firstName'
            : err.field === 'lastName' ? 'lastName'
            : err.field === 'email' ? 'email'
            : err.field === 'password' ? 'password'
            : err.field === 'phone' ? 'phone'
            : null;
          if (field && !fieldErrors[field]) {
            fieldErrors[field] = err.message;
          }
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        }
        toast.error(data.message || 'Validation failed. Please check your input.');
      } else {
        toast.error(data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen flex bg-neutral-50">
      
      {/* Left Branding Panel (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-forest-gradient text-white overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-hero-pattern opacity-60 pointer-events-none" />
        
        {/* Static Background Blobs (Optimized) */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-primary-400/20 rounded-full" />
        <div className="absolute bottom-20 -right-20 w-72 h-72 bg-emerald-400/20 rounded-full" />
        
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group mb-12">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
              <span className="text-white font-display font-bold text-2xl">V</span>
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-tight text-white">VerdantCare</h1>
              <p className="text-[10px] font-bold text-primary-300 tracking-widest uppercase mt-0.5">MEDICAL CENTER</p>
            </div>
          </Link>

          <h2 className="text-4xl lg:text-5xl font-display font-bold leading-tight mb-6">
            Join the Future of <br />Healthcare.
          </h2>
          
          <ul className="space-y-6 mt-12">
            {[
              { title: 'Unified Health Records', desc: 'All your medical data securely stored in one place.' },
              { title: 'Top Tier Specialists', desc: 'Connect with board-certified doctors across 15+ specialties.' },
              { title: 'Seamless Booking', desc: 'Schedule appointments or virtual consults in seconds.' }
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-4 text-primary-100/90">
                <div className="mt-1 w-6 h-6 rounded-full bg-primary-500/30 flex items-center justify-center shrink-0 border border-primary-500/50">
                  <CheckCircle2 size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{item.title}</h3>
                  <p className="text-sm mt-1">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 overflow-y-auto relative">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors group z-10"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="w-full max-w-xl animate-fade-in py-8">
          
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center shadow-sm mx-auto mb-3">
              <span className="text-white font-display font-bold text-xl">V</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-900">VerdantCare</h1>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold text-neutral-900 mb-2">Create Your Account</h2>
            <p className="text-neutral-500">Sign up to start managing your health journey.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`input-field pl-11 ${errors.firstName ? 'input-error' : ''}`}
                    placeholder="John"
                  />
                </div>
                {errors.firstName && <p className="error-msg"><AlertCircle size={14} /> {errors.firstName}</p>}
              </div>

              <div>
                <label className="label">Last Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`input-field pl-11 ${errors.lastName ? 'input-error' : ''}`}
                    placeholder="Doe"
                  />
                </div>
                {errors.lastName && <p className="error-msg"><AlertCircle size={14} /> {errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field pl-11 ${errors.email ? 'input-error' : ''}`}
                  placeholder="john.doe@example.com"
                />
              </div>
              {errors.email && <p className="error-msg"><AlertCircle size={14} /> {errors.email}</p>}
            </div>

            <div>
              <label className="label">Phone Number <span className="text-neutral-400 font-normal">(Optional)</span></label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`input-field pl-11 ${errors.phone ? 'input-error' : ''}`}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              {errors.phone && <p className="error-msg"><AlertCircle size={14} /> {errors.phone}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
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
                {errors.password && <p className="error-msg"><AlertCircle size={14} /> {errors.password}</p>}
                {!errors.password && formData.password && (
                  <div className="mt-2 space-y-1">
                    {[
                      { test: formData.password.length >= 8, label: 'At least 8 characters' },
                      { test: /[A-Z]/.test(formData.password), label: 'One uppercase letter' },
                      { test: /[a-z]/.test(formData.password), label: 'One lowercase letter' },
                      { test: /[0-9]/.test(formData.password), label: 'One number' },
                      { test: /[^A-Za-z0-9]/.test(formData.password), label: 'One special character' },
                    ].map((req) => (
                      <p key={req.label} className={`text-xs flex items-center gap-1.5 ${req.test ? 'text-green-600' : 'text-neutral-400'}`}>
                        {req.test ? <CheckCircle2 size={12} /> : <span className="w-3 h-3 rounded-full border border-neutral-300 inline-block" />}
                        {req.label}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`input-field pl-11 pr-11 ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && <p className="error-msg"><AlertCircle size={14} /> {errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5 mt-0.5 rounded border border-neutral-300 bg-white group-hover:border-primary-500 transition-colors shrink-0">
                  <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                  />
                  <div className="absolute inset-0 bg-primary-500 rounded opacity-0 peer-checked:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
                <span className="text-sm text-neutral-600 leading-relaxed">
                  I agree to the <Link to="/terms" className="text-primary-600 font-semibold hover:underline">Terms of Service</Link> and <Link to="/privacy-policy" className="text-primary-600 font-semibold hover:underline">Privacy Policy</Link>. I understand that VerdantCare Medical Center securely stores my health information.
                </span>
              </label>
              {errors.terms && <p className="error-msg mt-2"><AlertCircle size={14} /> {errors.terms}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary btn-xl w-full mt-8">
              {isSubmitting ? (
                <span className="flex items-center gap-2"><div className="spinner border-t-white border-2 w-5 h-5" /> Creating account...</span>
              ) : (
                <span className="flex items-center gap-2">Create Account <UserPlus size={18} /></span>
              )}
            </button>
          </form>

          <p className="text-center text-neutral-600 mt-8 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
