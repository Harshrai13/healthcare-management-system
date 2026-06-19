import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../api/authAPI';

const OTP_LENGTH = 4;
const OTP_EXPIRY_SECONDS = 600;
const RESEND_COOLDOWN = 30;

function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (step !== 2 || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 2) setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }, [step]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Please enter your email address'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address'); return; }

    setIsSubmitting(true);
    try {
      const response = await authAPI.forgotPassword(email);
      setStep(2);
      setTimeLeft(OTP_EXPIRY_SECONDS);
      // DEV ONLY: Show OTP from response for testing
      if (response.data?.devOtp) {
        toast.success(`Reset code: ${response.data.devOtp}`, { duration: 10000 });
      } else {
        toast.success('A 4-digit code has been sent to your email!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');
    if (value && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      setOtp(pasted.split(''));
      otpRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) { setError('Please enter the complete 4-digit code'); return; }

    setIsSubmitting(true);
    try {
      await authAPI.verifyResetOTP({ email, otp: otpCode });
      setStep(3);
      toast.success('Code verified! Now set your new password.');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setIsSubmitting(true);
    try {
      const response = await authAPI.forgotPassword(email);
      setOtp(['', '', '', '']);
      setTimeLeft(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN);
      // DEV ONLY: Show OTP from response for testing
      if (response.data?.devOtp) {
        toast.success(`New code: ${response.data.devOtp}`, { duration: 10000 });
      } else {
        toast.success('A new code has been sent!');
      }
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword) { setError('Please enter a new password'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(newPassword)) { setError('Password must contain at least one uppercase letter'); return; }
    if (!/[a-z]/.test(newPassword)) { setError('Password must contain at least one lowercase letter'); return; }
    if (!/[0-9]/.test(newPassword)) { setError('Password must contain at least one number'); return; }
    if (!/[^A-Za-z0-9]/.test(newPassword)) { setError('Password must contain at least one special character'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setIsSubmitting(true);
    try {
      await authAPI.resetPassword({ email, otp: otp.join(''), password: newPassword });
      setStep(4);
      toast.success('Password reset successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <div className="text-left">
              <h1 className="text-xl font-display font-bold text-primary-700">VerdantCare</h1>
              <p className="text-xs text-neutral-500">MEDICAL CENTER</p>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 p-8">
          {step < 4 && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${s <= step ? 'bg-primary-700 text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                    {s < step ? <CheckCircle size={16} /> : s}
                  </div>
                  {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-primary-700' : 'bg-neutral-200'}`} />}
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <h2 className="text-2xl font-display font-bold text-neutral-900 mb-2">Forgot Password?</h2>
              <p className="text-neutral-500 mb-6">Enter your email address and we'll send you a 4-digit verification code.</p>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} className="input-field pl-10" placeholder="your@email.com" disabled={isSubmitting} />
                  </div>
                  {error && <p className="flex items-center gap-1 text-sm text-red-600 mt-1"><AlertCircle size={14} /> {error}</p>}
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? 'Sending...' : 'Send Verification Code'}</button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-display font-bold text-neutral-900 mb-2">Verify Your Email</h2>
              <p className="text-neutral-500 mb-6">Enter the 4-digit code sent to <strong>{email}</strong></p>
              <div className="text-center mb-4">
                <span className={`text-sm font-medium ${timeLeft <= 60 ? 'text-red-600' : 'text-neutral-500'}`}>Code expires in {formatTime(timeLeft)}</span>
              </div>
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="flex justify-center gap-3">
                  {otp.map((digit, index) => (
                    <input key={index} ref={(el) => (otpRefs.current[index] = el)} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)} onPaste={handleOtpPaste} className="w-14 h-14 text-center text-2xl font-bold border-2 border-neutral-200 rounded-xl focus:border-primary-700 focus:ring-2 focus:ring-primary-100 outline-none transition-all" disabled={isSubmitting} />
                  ))}
                </div>
                {error && <p className="flex items-center justify-center gap-1 text-sm text-red-600"><AlertCircle size={14} /> {error}</p>}
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? 'Verifying...' : 'Verify Code'}</button>
              </form>
              <div className="text-center mt-4">
                <p className="text-sm text-neutral-500">Didn't receive the code?{' '}{resendCooldown > 0 ? <span className="text-neutral-400">Resend in {resendCooldown}s</span> : <button onClick={handleResendOtp} disabled={isSubmitting} className="text-primary-700 font-medium hover:underline inline-flex items-center gap-1"><RefreshCw size={14} /> Resend Code</button>}</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl font-display font-bold text-neutral-900 mb-2">Set New Password</h2>
              <p className="text-neutral-500 mb-6">Create a strong password for your account.</p>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">New Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(''); }} className="input-field pl-10 pr-10" placeholder="Min. 8 characters" disabled={isSubmitting} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }} className="input-field pl-10" placeholder="Re-enter your password" disabled={isSubmitting} />
                  </div>
                </div>
                {error && <p className="flex items-center gap-1 text-sm text-red-600"><AlertCircle size={14} /> {error}</p>}
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? 'Resetting...' : 'Reset Password'}</button>
              </form>
            </>
          )}

          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-display font-bold text-neutral-900 mb-2">Password Reset!</h2>
              <p className="text-neutral-500 mb-6">Your password has been reset successfully. You can now log in with your new password.</p>
              <Link to="/login" className="btn-primary inline-block">Go to Login</Link>
            </div>
          )}

          {step < 4 && (
            <div className="mt-6 pt-6 border-t border-neutral-100">
              <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-neutral-600 hover:text-primary-700 transition-colors">
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
