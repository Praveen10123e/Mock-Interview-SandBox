import type { FC } from 'react';
import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Briefcase,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import api from '../../api/axios/instance';
import { useNavigate, Link } from 'react-router-dom';

const RegisterSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterForm = z.infer<typeof RegisterSchema>;

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

export const Register: FC = () => {
  const [isOn, setIsOn] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

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

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      setRegisteredSuccess(true);
    } catch (error: any) {
      console.error('Registration failed', error);
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        'Registration failed. Please check your details and try again.';
      setAuthError(errMsg);
    } finally {
      setIsLoading(false);
    }
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
          background:
            'radial-gradient(ellipse 90% 80% at 35% 45%, rgba(45, 30, 10, 0.45) 0%, rgba(20, 14, 8, 0.25) 50%, rgba(6, 6, 8, 0) 85%)',
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

      {/* ── Main Container: Lamp + Register Form ── */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 lg:gap-24 relative z-10">

        {/* ═══════════════════════════════════════════════════════════════════
            FLOOR LAMP WITH PHYSICAL PULL STRING & SOFT CONE LIGHT
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative flex flex-col items-center justify-end h-[460px] sm:h-[520px] w-[280px] sm:w-[320px] shrink-0">

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
              height: '440px',
              clipPath: 'polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)',
              background:
                'linear-gradient(180deg, rgba(255, 230, 150, 0.55) 0%, rgba(255, 200, 80, 0.28) 25%, rgba(255, 170, 45, 0.10) 65%, rgba(255, 150, 30, 0.0) 100%)',
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
              background:
                'radial-gradient(ellipse at center, rgba(255, 215, 120, 0.45) 0%, rgba(255, 180, 60, 0.16) 45%, transparent 75%)',
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
                background:
                  'radial-gradient(ellipse at center, rgba(255, 255, 220, 0.95) 0%, rgba(255, 210, 100, 0.6) 40%, transparent 80%)',
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
              aria-label="Toggle Lamp Register"
              title={isOn ? "Pull cord to turn OFF" : "Pull cord to turn ON"}
            >
              {/* Highlight gleam */}
              <span className="absolute top-1 left-0.5 w-1 h-2 rounded-full bg-white/50 blur-[0.5px]" />
            </motion.button>
          </div>

          {/* ── Vertical Lamp Stand (Pole) ── */}
          <div className="w-2 sm:w-2.5 h-[410px] sm:h-[450px] bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-900 border-x border-zinc-700/50 shadow-inner relative z-10" />

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
            REGISTER CARD PANEL (Reveals on Lamp ON)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="w-full max-w-[420px] sm:max-w-[450px] min-h-[480px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isOn && (
              <motion.div
                key="register-panel"
                initial={{ opacity: 0, x: 35, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 25, scale: 0.96 }}
                transition={{
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="w-full rounded-2xl bg-[#121316]/95 border border-white/[0.08] p-6 sm:p-7 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl relative z-20 text-slate-100"
              >
                {/* ── NM Sandbox Minimal Header ── */}
                <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-white/[0.07]">
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

                {registeredSuccess ? (
                  /* ── Success State ── */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4 space-y-4"
                  >
                    <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight text-white">Account Created</h2>
                      <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                        Your account has been registered successfully. You can now sign in to your dashboard.
                      </p>
                    </div>
                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm tracking-wider text-zinc-950 bg-white hover:bg-zinc-100 active:bg-zinc-200 active:scale-[0.99] transition-all duration-150 shadow-[0_2px_14px_rgba(255,255,255,0.16)] flex items-center justify-center cursor-pointer border border-white"
                      >
                        PROCEED TO SIGN IN
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {/* ── Create Account Title ── */}
                    <div className="mb-4">
                      <h2 className="text-xl font-bold tracking-tight text-white">Create Account</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Get started with NM Mock Interview Sandbox.
                      </p>
                    </div>

                    {/* ── Registration Form ── */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                      {/* Name Fields (First Name & Last Name) */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-300">First Name</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none flex items-center">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <input
                              {...register('firstName')}
                              placeholder="Jane"
                              className={`w-full h-10 rounded-xl bg-[#181920] border ${
                                errors.firstName
                                  ? 'border-rose-500 focus:border-rose-500'
                                  : 'border-zinc-700/70 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                              } pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all duration-150 shadow-2xs`}
                            />
                          </div>
                          {errors.firstName && (
                            <p className="text-[10px] text-rose-400 mt-0.5 pl-1">{errors.firstName.message}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-zinc-300">Last Name</label>
                          <input
                            {...register('lastName')}
                            placeholder="Doe"
                            className="w-full h-10 rounded-xl bg-[#181920] border border-zinc-700/70 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all duration-150 shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-300">Email Address</label>
                        <div className="relative">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none flex items-center">
                            <Mail className="h-4 w-4" />
                          </div>
                          <input
                            {...register('email')}
                            type="email"
                            placeholder="student@example.com"
                            className={`w-full h-10 rounded-xl bg-[#181920] border ${
                              errors.email
                                ? 'border-rose-500 focus:border-rose-500'
                                : 'border-zinc-700/70 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                            } pl-10 pr-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all duration-150 shadow-2xs`}
                          />
                        </div>
                        {errors.email && (
                          <p className="text-[10px] text-rose-400 mt-0.5 pl-1">{errors.email.message}</p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-300">Password</label>
                        <div className="relative">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none flex items-center">
                            <Lock className="h-4 w-4" />
                          </div>
                          <input
                            {...register('password')}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className={`w-full h-10 rounded-xl bg-[#181920] border ${
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
                          <p className="text-[10px] text-rose-400 mt-0.5 pl-1">{errors.password.message}</p>
                        )}
                      </div>


                      {/* Auth Error Banner */}
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
                            "REGISTER ACCOUNT"
                          )}
                        </button>
                      </div>
                    </form>

                    {/* Footer Link to Login */}
                    <div className="mt-4 pt-3.5 border-t border-white/[0.08] text-center text-xs text-zinc-400">
                      <p>
                        Already have an account?{' '}
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 underline font-medium">
                          Sign in here
                        </Link>
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Register;
