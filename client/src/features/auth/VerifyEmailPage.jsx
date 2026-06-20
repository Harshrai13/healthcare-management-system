import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../api/authAPI';

function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      toast.error('No email provided. Please register first.');
      navigate('/register');
    }
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsSubmitting(true);
    try {
      await authAPI.verifyEmail({ email, otp: code });
      setIsVerified(true);
      toast.success('Email verified successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed. Please try again.');
      // Clear OTP inputs on failure
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const response = await authAPI.resendVerification(email);
      if (response.data?.emailSent === false) {
        toast('Email service is not configured. Please contact support to set up SMTP.', { icon: '⚠️', duration: 8000 });
      } else {
        toast.success('A new verification code has been sent to your email.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-display font-bold text-neutral-900 mb-3">Email Verified!</h1>
          <p className="text-neutral-500 mb-8">Your account has been successfully verified. You can now sign in and start using VerdantCare.</p>
          <Link to="/login" className="btn-primary btn-xl w-full inline-flex items-center justify-center gap-2">
            Continue to Sign In <Mail size={18} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-forest-gradient text-white overflow-hidden flex-col justify-center p-12">
        <div className="absolute inset-0 bg-hero-pattern opacity-30 mix-blend-overlay pointer-events-none" />
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
            One Step Away from<br />Better Healthcare.
          </h2>
          <p className="text-primary-100/80 text-lg max-w-md">Verify your email to unlock your patient portal, book appointments, and access your medical records.</p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
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
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4 mx-auto lg:mx-0">
              <Mail size={28} className="text-primary-600" />
            </div>
            <h2 className="text-3xl font-display font-bold text-neutral-900 mb-2">Verify Your Email</h2>
            <p className="text-neutral-500">
              We've sent a 6-digit verification code to<br />
              <span className="font-semibold text-neutral-700">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-3" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 border-neutral-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all bg-white"
                />
              ))}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary btn-xl w-full">
              {isSubmitting ? (
                <span className="flex items-center gap-2"><div className="spinner border-t-white border-2 w-5 h-5" /> Verifying...</span>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          <div className="text-center mt-8 space-y-4">
            <p className="text-neutral-500 text-sm">
              Didn't receive the code?{' '}
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-primary-600 font-semibold hover:text-primary-700 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
              >
                {isResending ? (
                  <><RefreshCw size={14} className="animate-spin" /> Sending...</>
                ) : (
                  'Resend code'
                )}
              </button>
            </p>
            <p className="text-neutral-400 text-xs">
              The code expires in 15 minutes. Check your spam folder if you don't see it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
