import type { FC } from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Briefcase,
  ChevronLeft,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  RotateCw,
} from 'lucide-react';
import api from '../../api/axios/instance';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/AuthStore';
import { useNavigate, Link } from 'react-router-dom';

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof LoginSchema>;

type AuthMode = 'LOGIN' | 'FORGOT_EMAIL' | 'FORGOT_OTP' | 'FORGOT_NEW_PASSWORD' | 'FORGOT_SUCCESS';

/** Synthesizes a crisp physical click sound using Web Audio API */
const playLampClickSound = (turningOn: boolean) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(turningOn ? 860 : 540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(turningOn ? 380 : 180, ctx.currentTime + 0.045);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // Gracefully ignore if audio context is blocked
  }
};

export const Login: FC = () => {
  const [isOn, setIsOn] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Forgot Password Flow State ──
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [forgotEmail, setForgotEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [flowSuccess, setFlowSuccess] = useState<string | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const toggleLamp = useCallback(() => {
    if (isPulling) return;
    setIsPulling(true);
    setTimeout(() => {
      setIsOn((prev) => {
        const next = !prev;
        playLampClickSound(next);
        return next;
      });
      setIsPulling(false);
    }, 180);
  }, [isPulling]);

  // ── Countdown Timer for OTP Resend ──
  useEffect(() => {
    let timer: any;
    if (authMode === 'FORGOT_OTP' && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authMode, otpCountdown]);

  // ── Focus first OTP box on entering OTP step ──
  useEffect(() => {
    if (authMode === 'FORGOT_OTP') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [authMode]);

  // ── Login Submit ──
  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', data);
      const responseData = res.data.data;
      setAuth(responseData.user, responseData.accessToken);

      const role = responseData.user.roles[0];
      if (role === 'STUDENT') navigate('/student/dashboard');
      else if (role === 'FACULTY') navigate('/faculty/dashboard');
      else navigate('/admin/dashboard');
    } catch (error: any) {
      console.error('Login failed', error);
      setAuthError(
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Invalid credentials. Please verify your email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Transition to Forgot Password ──
  const handleOpenForgotPassword = () => {
    const currentEmail = getValues('email');
    if (currentEmail) {
      setForgotEmail(currentEmail);
    }
    setFlowError(null);
    setFlowSuccess(null);
    setAuthMode('FORGOT_EMAIL');
  };

  // ── Step 1: Send OTP ──
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      setFlowError('Email address is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setFlowError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setFlowError(null);
    setFlowSuccess(null);

    try {
      const res = await authApi.sendPasswordResetOtp(trimmed);
      const data = res.data;
      setMaskedEmail(data?.email || trimmed);
      setOtp(['', '', '', '', '', '']);
      setOtpCountdown(60);
      setFlowSuccess('OTP sent successfully. Check your email for the 6-digit verification code.');
      setAuthMode('FORGOT_OTP');
    } catch (error: any) {
      setFlowError(
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Unable to send the verification code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ──
  const handleResendOtp = async () => {
    if (otpCountdown > 0 || isResending) return;
    setIsResending(true);
    setFlowError(null);
    setFlowSuccess(null);
    try {
      const res = await authApi.sendPasswordResetOtp(forgotEmail);
      const data = res.data;
      setMaskedEmail(data?.email || forgotEmail);
      setOtp(['', '', '', '', '', '']);
      setOtpCountdown(60);
      setFlowSuccess('A new verification code has been sent to your email.');
      otpInputRefs.current[0]?.focus();
    } catch (error: any) {
      setFlowError(
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Unable to send the verification code. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  // ── Step 2: OTP Input Handling ──
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric
    const cleanValue = value.replace(/\D/g, '');
    const newOtp = [...otp];

    if (cleanValue.length > 1) {
      // Pasted multiple digits
      const digits = cleanValue.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      const lastIndex = Math.min(digits.length, 5);
      otpInputRefs.current[lastIndex]?.focus();
      return;
    }

    newOtp[index] = cleanValue;
    setOtp(newOtp);

    // Auto-advance
    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const newOtp = [...otp];
    const digits = pastedData.split('');
    for (let i = 0; i < 6; i++) {
      newOtp[i] = digits[i] || '';
    }
    setOtp(newOtp);
    const targetIdx = Math.min(digits.length, 5);
    otpInputRefs.current[targetIdx]?.focus();
  };

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpCode = otp.join('').trim();
    if (otpCode.length !== 6) {
      setFlowError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    setFlowError(null);
    setFlowSuccess(null);

    try {
      const res = await authApi.verifyPasswordResetOtp(forgotEmail, otpCode);
      const data = res.data?.data || res.data;
      setResetToken(data?.resetToken || '');
      setNewPassword('');
      setConfirmPassword('');
      setAuthMode('FORGOT_NEW_PASSWORD');
    } catch (error: any) {
      setFlowError(
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Invalid verification code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Password Strength Evaluation ──
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-zinc-700' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  // ── Step 3: Reset Password ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setFlowError('New password is required');
      return;
    }
    if (newPassword.length < 8) {
      setFlowError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFlowError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setFlowError(null);
    setFlowSuccess(null);

    try {
      await authApi.resetPasswordWithToken({
        resetToken,
        newPassword,
        confirmPassword,
      });
      setAuthMode('FORGOT_SUCCESS');
    } catch (error: any) {
      setFlowError(
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to reset password. Please request a new OTP.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset Back to Login ──
  const resetToLogin = () => {
    setAuthMode('LOGIN');
    setForgotEmail('');
    setMaskedEmail('');
    setOtp(['', '', '', '', '', '']);
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setFlowError(null);
    setFlowSuccess(null);
    setAuthError(null);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#060608] text-slate-100 flex items-center justify-center font-sans select-none transition-colors duration-700">
      {/* ── Ambient Background Illumination (When Lamp is ON) ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
        animate={{
          opacity: isOn ? 1 : 0,
        }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: 'radial-gradient(ellipse 90% 80% at 35% 45%, rgba(45, 30, 10, 0.45) 0%, rgba(20, 14, 8, 0.25) 50%, rgba(6, 6, 8, 0) 85%)',
        }}
      />

      {/* ── Top Left Back Button ── */}
      <div className="absolute top-6 left-6 z-30">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-zinc-400 hover:text-zinc-200 border border-white/[0.06] backdrop-blur-md transition-all duration-200"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Overview
        </Link>
      </div>

      {/* ── Main Container: Lamp + Form ── */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 lg:gap-24 relative z-10">

        {/* ═══════════════════════════════════════════════════════════════════
            FLOOR LAMP WITH PHYSICAL PULL STRING & SOFT CONE LIGHT
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative flex flex-col items-center justify-end h-[460px] sm:h-[500px] w-[280px] sm:w-[320px] shrink-0">

          {/* ── Light Beam Cone (Polygon Projected Under Lamp Head) ── */}
          <motion.div
            className="absolute top-[28px] pointer-events-none z-0"
            initial={false}
            animate={{
              opacity: isOn ? 1 : 0,
              scaleY: isOn ? 1 : 0.4,
              scaleX: isOn ? 1 : 0.7,
            }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              transformOrigin: 'top center',
              width: '320px',
              height: '420px',
              clipPath: 'polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)',
              background: 'linear-gradient(180deg, rgba(255, 230, 150, 0.55) 0%, rgba(255, 200, 80, 0.28) 25%, rgba(255, 170, 45, 0.10) 65%, rgba(255, 150, 30, 0.0) 100%)',
              filter: 'blur(3px)',
            }}
          />

          {/* ── Floor Light Reflection / Oval Glow ── */}
          <motion.div
            className="absolute bottom-[2px] pointer-events-none z-0"
            initial={false}
            animate={{
              opacity: isOn ? 1 : 0,
              scale: isOn ? 1 : 0.6,
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: '280px',
              height: '70px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(255, 215, 120, 0.45) 0%, rgba(255, 180, 60, 0.16) 45%, transparent 75%)',
              filter: 'blur(4px)',
            }}
          />

          {/* ── Lamp Head Structure (Cap, Diffuser, Flare) ── */}
          <div
            onClick={toggleLamp}
            className="relative z-10 flex flex-col items-center cursor-pointer group select-none"
            title={isOn ? "Click lamp to turn OFF" : "Click lamp to turn ON"}
          >
            {/* Top Lamp Cap */}
            <div className="w-36 sm:w-44 h-5 rounded-full bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border-t border-zinc-500/30 shadow-md relative z-10 group-hover:brightness-110 transition-all" />

            {/* Glowing Diffuser Underside */}
            <motion.div
              className="w-32 sm:w-40 h-2.5 -mt-1 rounded-full relative z-10"
              initial={false}
              animate={{
                backgroundColor: isOn ? '#FFF4D0' : '#27272a',
                boxShadow: isOn
                  ? '0 0 30px 10px rgba(255, 210, 90, 0.9), 0 0 70px 25px rgba(255, 180, 50, 0.55), 0 0 120px 50px rgba(255, 150, 30, 0.25)'
                  : 'none',
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Subtle bulb flare halo */}
            <motion.div
              className="absolute top-1 w-24 h-12 rounded-full pointer-events-none"
              initial={false}
              animate={{
                opacity: isOn ? 0.9 : 0,
              }}
              transition={{ duration: 0.3 }}
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255, 255, 220, 0.95) 0%, rgba(255, 210, 100, 0.6) 40%, transparent 80%)',
                filter: 'blur(6px)',
              }}
            />
          </div>

          {/* ── Hanging Pull String & Handle ── */}
          <div
            onClick={toggleLamp}
            className="absolute top-[20px] left-[56%] sm:left-[57%] z-20 flex flex-col items-center cursor-pointer px-3 py-1 group select-none"
            title={isOn ? "Pull cord to turn OFF" : "Pull cord to turn ON"}
          >
            {/* Pull Cord String */}
            <motion.div
              className="w-[1.5px] bg-gradient-to-b from-zinc-400 via-zinc-400 to-zinc-300 origin-top group-hover:w-[2px] transition-all"
              animate={{
                height: isPulling ? 64 : 44,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 14,
              }}
            />

            {/* Pull Bead / Handle */}
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleLamp();
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              animate={{
                y: isPulling ? 20 : 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 450,
                damping: 12,
              }}
              className="w-3.5 h-6 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 -mt-0.5 relative group shadow-md"
              style={{
                background: 'linear-gradient(135deg, #FDE68A 0%, #D97706 60%, #92400E 100%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: isOn
                  ? '0 0 12px rgba(251, 191, 36, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                  : '0 2px 6px rgba(0,0,0,0.8)',
              }}
              aria-label="Toggle Lamp Login"
              title={isOn ? "Pull cord to turn OFF" : "Pull cord to turn ON"}
            >
              {/* Highlight gleam */}
              <span className="absolute top-1 left-0.5 w-1 h-2 rounded-full bg-white/50 blur-[0.5px]" />
            </motion.button>
          </div>

          {/* ── Vertical Lamp Stand (Pole) ── */}
          <div className="w-2 sm:w-2.5 h-[390px] sm:h-[430px] bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-900 border-x border-zinc-700/50 shadow-inner relative z-10" />

          {/* ── Lamp Base (Round Foot Plate) ── */}
          <div className="w-32 sm:w-40 h-3.5 rounded-full bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border-t border-zinc-500/40 shadow-[0_10px_25px_rgba(0,0,0,0.9)] relative z-10" />

          {/* ── "Pull the string to begin" Hint (Visible in OFF state) ── */}
          <AnimatePresence>
            {!isOn && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="absolute top-[82px] left-[66%] sm:left-[68%] whitespace-nowrap z-20"
              >
                <button
                  type="button"
                  onClick={toggleLamp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/95 border border-amber-400/30 text-[11px] font-medium text-amber-200/95 shadow-xl backdrop-blur-md hover:bg-zinc-800 hover:border-amber-400/60 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                  title="Click to turn on the lamp"
                >
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <span>Pull string to turn ON</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            LOGIN & PASSWORD RESET PANEL
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="w-full max-w-[390px] sm:max-w-[420px] min-h-[460px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isOn && (
              <motion.div
                key="panel-card"
                initial={{ opacity: 0, x: 35, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 25, scale: 0.96 }}
                transition={{
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="w-full rounded-2xl bg-[#121316]/95 border border-white/[0.08] p-6 sm:p-7 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl relative z-20 text-slate-100 min-h-[460px] flex flex-col justify-between"
              >
                {/* ── NM Sandbox Minimal Header ── */}
                <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-white/[0.07]">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-2xs">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-200">
                      NM Sandbox
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Technical Interview & Assessment
                    </div>
                  </div>
                </div>

                {/* ── Multi-Step Inner Content with Smooth Transitions ── */}
                <div className="flex-1 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {/* ══════════════════════════════════════════════════════
                        STEP 0: NORMAL LOGIN FORM
                    ══════════════════════════════════════════════════════ */}
                    {authMode === 'LOGIN' && (
                      <motion.div
                        key="step-login"
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                      >
                        {/* Welcome Back Title */}
                        <div className="mb-5">
                          <h2 className="text-xl font-bold tracking-tight text-white">Welcome Back</h2>
                          <p className="text-xs text-zinc-400 mt-0.5">Sign in to continue to NM Sandbox</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                          {/* Email Address */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-300">Email Address</label>
                            <div className="relative">
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none flex items-center">
                                <Mail className="h-4 w-4" />
                              </div>
                              <input
                                {...register('email')}
                                type="email"
                                placeholder="student@example.com"
                                className={`w-full h-11 rounded-xl bg-[#181920] border ${
                                  errors.email
                                    ? 'border-rose-500 focus:border-rose-500'
                                    : 'border-zinc-700/70 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                                } pl-10 pr-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all duration-150 shadow-2xs`}
                              />
                            </div>
                            {errors.email && (
                              <p className="text-[11px] text-rose-400 mt-1 pl-1">{errors.email.message}</p>
                            )}
                          </div>

                          {/* Password */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-zinc-300">Password</label>
                              <button
                                type="button"
                                onClick={handleOpenForgotPassword}
                                className="text-[11px] text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer font-medium"
                              >
                                Forgot Password?
                              </button>
                            </div>
                            <div className="relative">
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none flex items-center">
                                <Lock className="h-4 w-4" />
                              </div>
                              <input
                                {...register('password')}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className={`w-full h-11 rounded-xl bg-[#181920] border ${
                                  errors.password
                                    ? 'border-rose-500 focus:border-rose-500'
                                    : 'border-zinc-700/70 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                                } pl-10 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all duration-150 shadow-2xs`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            {errors.password && (
                              <p className="text-[11px] text-rose-400 mt-1 pl-1">{errors.password.message}</p>
                            )}
                          </div>

                          {/* Error Message */}
                          <AnimatePresence>
                            {authError && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2"
                              >
                                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                                <p>{authError}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Submit Button (Light box with bold black text) */}
                          <div className="pt-2">
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm tracking-wider text-zinc-950 bg-white hover:bg-zinc-100 active:bg-zinc-200 active:scale-[0.99] transition-all duration-150 shadow-[0_2px_14px_rgba(255,255,255,0.16)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center cursor-pointer border border-white"
                            >
                              {isLoading ? (
                                <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                              ) : (
                                "SIGN IN"
                              )}
                            </button>
                          </div>
                        </form>

                        {/* Footer Register Link */}
                        <div className="mt-5 pt-4 border-t border-white/[0.08] text-center text-xs text-zinc-400">
                          <p>
                            Don't have an account?{' '}
                            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 underline font-medium">
                              Create one now
                            </Link>
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        STEP 1: FORGOT PASSWORD — ENTER EMAIL
                    ══════════════════════════════════════════════════════ */}
                    {authMode === 'FORGOT_EMAIL' && (
                      <motion.div
                        key="step-forgot-email"
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                      >
                        {/* Title & Description */}
                        <div className="mb-5">
                          <h2 className="text-xl font-bold tracking-tight text-white">Reset your password</h2>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                            Enter the email address associated with your NM Sandbox account.
                          </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSendOtp} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-300">Email Address</label>
                            <div className="relative">
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none flex items-center">
                                <Mail className="h-4 w-4" />
                              </div>
                              <input
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => {
                                  setForgotEmail(e.target.value);
                                  setFlowError(null);
                                }}
                                placeholder="student@example.com"
                                className="w-full h-11 rounded-xl bg-[#181920] border border-zinc-700/70 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 pl-10 pr-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all duration-150 shadow-2xs"
                              />
                            </div>
                          </div>

                          {/* Error Message */}
                          <AnimatePresence>
                            {flowError && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2"
                              >
                                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                                <p>{flowError}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Submit Button */}
                          <div className="pt-2">
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm tracking-wider text-zinc-950 bg-white hover:bg-zinc-100 active:bg-zinc-200 active:scale-[0.99] transition-all duration-150 shadow-[0_2px_14px_rgba(255,255,255,0.16)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center cursor-pointer border border-white"
                            >
                              {isLoading ? (
                                <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                              ) : (
                                "SEND OTP"
                              )}
                            </button>
                          </div>
                        </form>

                        {/* Back to Sign In */}
                        <div className="mt-5 pt-4 border-t border-white/[0.08] text-center">
                          <button
                            type="button"
                            onClick={resetToLogin}
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer font-medium"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        STEP 2: OTP VERIFICATION
                    ══════════════════════════════════════════════════════ */}
                    {authMode === 'FORGOT_OTP' && (
                      <motion.div
                        key="step-forgot-otp"
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                      >
                        {/* Title & Masked Email */}
                        <div className="mb-4">
                          <h2 className="text-xl font-bold tracking-tight text-white">Verify your email</h2>
                          <p className="text-xs text-zinc-400 mt-1">
                            Enter the 6-digit verification code sent to
                          </p>
                          <p className="text-xs font-mono font-semibold text-amber-300 mt-0.5">
                            {maskedEmail}
                          </p>
                        </div>

                        {/* Success Banner */}
                        {flowSuccess && (
                          <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                            <span>{flowSuccess}</span>
                          </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                          {/* 6 OTP Input Boxes */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                              {otp.map((digit, index) => (
                                <input
                                  key={index}
                                  ref={(el) => {
                                    otpInputRefs.current[index] = el;
                                  }}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) => handleOtpChange(index, e.target.value)}
                                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                  onPaste={handleOtpPaste}
                                  className="w-11 h-12 sm:w-12 sm:h-13 rounded-xl bg-[#181920] border border-zinc-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 text-center text-lg sm:text-xl font-mono font-bold text-white focus:outline-none transition-all duration-150 shadow-2xs selection:bg-indigo-500/30"
                                />
                              ))}
                            </div>
                          </div>

                          {/* Error Message */}
                          <AnimatePresence>
                            {flowError && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2"
                              >
                                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                                <p>{flowError}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Verify OTP Button */}
                          <div className="pt-1">
                            <button
                              type="submit"
                              disabled={isLoading || otp.join('').length !== 6}
                              className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm tracking-wider text-zinc-950 bg-white hover:bg-zinc-100 active:bg-zinc-200 active:scale-[0.99] transition-all duration-150 shadow-[0_2px_14px_rgba(255,255,255,0.16)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center cursor-pointer border border-white"
                            >
                              {isLoading ? (
                                <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                              ) : (
                                "VERIFY OTP"
                              )}
                            </button>
                          </div>

                          {/* Resend Countdown / Trigger */}
                          <div className="text-center pt-1">
                            {otpCountdown > 0 ? (
                              <span className="text-xs text-zinc-400 font-mono">
                                Resend OTP in 00:{otpCountdown < 10 ? `0${otpCountdown}` : otpCountdown}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={isResending}
                                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition-colors"
                              >
                                <RotateCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                                Resend OTP
                              </button>
                            )}
                          </div>
                        </form>

                        {/* Back Navigation */}
                        <div className="mt-4 pt-3 border-t border-white/[0.08] text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setFlowError(null);
                              setFlowSuccess(null);
                              setAuthMode('FORGOT_EMAIL');
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer font-medium"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        STEP 3: CREATE NEW PASSWORD
                    ══════════════════════════════════════════════════════ */}
                    {authMode === 'FORGOT_NEW_PASSWORD' && (
                      <motion.div
                        key="step-forgot-new-pwd"
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                      >
                        {/* Title & Description */}
                        <div className="mb-4">
                          <h2 className="text-xl font-bold tracking-tight text-white">Create a new password</h2>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                            Your email has been verified. Create a new password for your account.
                          </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleResetPassword} className="space-y-3.5">
                          {/* New Password */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-300">New Password</label>
                            <div className="relative">
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none flex items-center">
                                <KeyRound className="h-4 w-4" />
                              </div>
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => {
                                  setNewPassword(e.target.value);
                                  setFlowError(null);
                                }}
                                placeholder="••••••••"
                                className="w-full h-11 rounded-xl bg-[#181920] border border-zinc-700/70 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 pl-10 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all duration-150 shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                              >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Confirm Password */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-300">Confirm Password</label>
                            <div className="relative">
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none flex items-center">
                                <Lock className="h-4 w-4" />
                              </div>
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => {
                                  setConfirmPassword(e.target.value);
                                  setFlowError(null);
                                }}
                                placeholder="••••••••"
                                className="w-full h-11 rounded-xl bg-[#181920] border border-zinc-700/70 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 pl-10 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all duration-150 shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Password Requirements & Compact Strength Indicator */}
                          <div className="space-y-1.5 pt-0.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400">Use at least 8 characters</span>
                              {newPassword && (
                                <span className={`font-semibold ${strength.score === 3 ? 'text-emerald-400' : strength.score === 2 ? 'text-amber-400' : 'text-rose-400'}`}>
                                  {strength.label}
                                </span>
                              )}
                            </div>
                            {newPassword && (
                              <div className="grid grid-cols-3 gap-1.5 h-1.5">
                                <div className={`rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-zinc-700'}`} />
                                <div className={`rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-zinc-700'}`} />
                                <div className={`rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-zinc-700'}`} />
                              </div>
                            )}
                          </div>

                          {/* Error Message */}
                          <AnimatePresence>
                            {flowError && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2"
                              >
                                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                                <p>{flowError}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Submit Button */}
                          <div className="pt-2">
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm tracking-wider text-zinc-950 bg-white hover:bg-zinc-100 active:bg-zinc-200 active:scale-[0.99] transition-all duration-150 shadow-[0_2px_14px_rgba(255,255,255,0.16)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center cursor-pointer border border-white"
                            >
                              {isLoading ? (
                                <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                              ) : (
                                "RESET PASSWORD"
                              )}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        STEP 4: SUCCESS STATE
                    ══════════════════════════════════════════════════════ */}
                    {authMode === 'FORGOT_SUCCESS' && (
                      <motion.div
                        key="step-forgot-success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="text-center py-4 space-y-5"
                      >
                        {/* Glowing Success Check Icon */}
                        <div className="flex justify-center">
                          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                            <CheckCircle2 className="h-7 w-7" />
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-1.5">
                          <h2 className="text-xl font-bold tracking-tight text-white">Password updated</h2>
                          <p className="text-xs text-zinc-400 leading-relaxed max-w-[280px] mx-auto">
                            Your password has been successfully changed. You can now sign in with your new password.
                          </p>
                        </div>

                        {/* Back to Sign In Button */}
                        <div className="pt-3">
                          <button
                            type="button"
                            onClick={resetToLogin}
                            className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm tracking-wider text-zinc-950 bg-white hover:bg-zinc-100 active:bg-zinc-200 active:scale-[0.99] transition-all duration-150 shadow-[0_2px_14px_rgba(255,255,255,0.16)] flex items-center justify-center cursor-pointer border border-white"
                          >
                            BACK TO SIGN IN
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Login;
