import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  GraduationCap,
  Mail,
  Lock,
  ShieldCheck,
  User,
  Info,
  ArrowRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { loginSchema } from '../utils/validators';
import { Button, Field, Modal, Notice } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/useStore';
import { api } from '../services/api';
import AboutMaatramModal from '../components/auth/AboutMaatramModal';
import LegalInfoModal from '../components/auth/LegalInfoModal';
import PortalSetupModal from '../components/auth/PortalSetupModal';
import logo from '../assets/logo.svg';

export default function Login() {
  usePageTitle('Student Portal Sign In');
  const { signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Modals state
  const [aboutOpen, setAboutOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('privacy');

  // Forgot password modal state
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const [loginError, setLoginError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '', remember: true },
  });

  const onSubmit = async ({ login, password }) => {
    setLoginError('');
    setBusy(true);

    try {
      const res = await api.post('/auth/login', {
        email: login.trim(),
        password,
      });

      if (res?.data?.accessToken) {
        api.setToken(res.data.accessToken);
        const user = res.data.user;
        const targetId = user.profile?.id || user.id;
        signIn(targetId, user);

        toast.success(`Welcome back, ${user.profile?.name || user.email}!`);

        if (user.mustChangePassword) {
          nav('/change-password', { replace: true });
        } else {
          nav(loc.state?.from ?? '/dashboard', { replace: true });
        }
        return;
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid student email/ID or password. Please verify your credentials.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      toast.error('Please enter a valid registered student email address.');
      return;
    }

    try {
      setForgotBusy(true);
      await api.post('/auth/forgot-password', {
        email: forgotEmail.trim(),
        portal: 'student',
      });
      setForgotSent(true);
      toast.success('Password recovery link dispatched to your registered email.');
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch password recovery email.');
    } finally {
      setForgotBusy(false);
    }
  };

  const openLegal = (tab) => {
    setLegalTab(tab);
    setLegalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* ── TOP HEADER (Brand & Global Utilities) ── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Maatram Foundation Brand Logo" className="h-10 w-10 rounded-xl shadow-sm" />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-none">
              Maatram Foundation
            </span>
            <span className="text-[10px] font-bold tracking-widest text-[#0b6f60] uppercase mt-1">
              AVAILABILITY PLANNER PORTAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 text-xs font-medium text-slate-600">
          <span className="text-slate-900 font-semibold cursor-pointer">Sign In</span>
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            className="hover:text-slate-900 transition cursor-pointer hidden md:inline"
          >
            Portal Setup
          </button>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="hover:text-slate-900 transition cursor-pointer hidden sm:inline"
          >
            Need Help / About Maatram
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden xs:inline">256-Bit SSL Secured</span>
            <span className="xs:hidden">SSL</span>
          </div>

          <div
            title="Scholar Portal"
            className="w-8 h-8 rounded-full bg-[#065f46] text-white flex items-center justify-center font-bold text-xs shadow-sm"
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* ── MAIN FLOATING CARD CONTAINER ── */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-auto py-4">
        <div className="rounded-3xl overflow-hidden shadow-2xl shadow-slate-300/60 border border-slate-200/90 bg-white grid lg:grid-cols-12">
          {/* ── LEFT HERO PANEL: Deep Forest Emerald Identity ── */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#063b33] via-[#052e28] to-[#03231e] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Ambient emerald radial glow */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Top Row: Ecosystem pill & About link */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 border border-white/10 text-[11px] font-semibold tracking-wide">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="truncate">Maatram Foundation</span>
                  <span className="text-white/40 hidden xs:inline">•</span>
                  <span className="text-[10px] text-emerald-300 hidden xs:inline uppercase">STUDENT SUCCESS ECOSYSTEM</span>
                </div>

                <button
                  type="button"
                  onClick={() => setAboutOpen(true)}
                  className="text-xs text-emerald-200/90 hover:text-white transition flex items-center gap-1 shrink-0"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>About Maatram</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Sub-pill */}
              <div className="mt-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold tracking-wider">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>STUDENT AVAILABILITY PORTAL</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mt-3">
                Your opportunities<br />
                begin with being<br />
                available.
              </h1>

              {/* Description */}
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed mt-4">
                Stay connected with Maatram Foundation. Manage your weekly availability, discover upcoming programmes, and never miss an opportunity to participate.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-medium border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Weekly Roster Sync
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-medium border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  Training & Bootcamps
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-medium border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                  Direct Officer Support
                </span>
              </div>
            </div>

            {/* Bottom Scholar Quote Card */}
            <div className="relative z-10 mt-8 rounded-2xl bg-black/25 border border-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-serif text-2xl font-bold leading-none select-none">“</span>
                <div className="space-y-2">
                  <p className="text-xs text-emerald-100/90 italic leading-relaxed">
                    Submitting my weekly availability unlocked hands-on industry boot camps and mentor mock interviews across colleges.
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-emerald-300/80 border-t border-white/10 pt-2 font-medium">
                    <span>Kavitha R. • B.Tech 2025 Cohort</span>
                    <span className="text-emerald-400 font-semibold">Maatram Scholar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT FORM PANEL: Crisp Interactive Form ── */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              {/* Scholar Workspace Access Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold tracking-wide">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                <span>SCHOLAR WORKSPACE ACCESS</span>
              </div>

              {/* Form Title & Subtitle */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                Student Sign In
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Sign in to submit your weekly availability and explore upcoming programmes.
              </p>

              {/* Login Error Notification */}
              {loginError && (
                <Notice tone="danger" className="my-4 text-xs font-semibold">
                  {loginError}
                </Notice>
              )}

              {/* Sign In Form - Only Login Method */}
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
                {/* Field 1: Email Address or Student ID */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <label htmlFor="student-login">Student Registered Email</label>
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified ID
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="student-login"
                      type="text"
                      autoComplete="username"
                      placeholder="kavitha.ramesh@student.maatram.org"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition"
                      aria-invalid={!!errors.login}
                      {...register('login')}
                    />
                  </div>
                  {errors.login && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.login.message}</p>
                  )}
                </div>

                {/* Field 2: Password */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <label htmlFor="student-password">Student Portal Password</label>
                    <button
                      type="button"
                      onClick={() => { setForgot(true); setForgotSent(false); }}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="student-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition"
                      aria-invalid={!!errors.password}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition p-0.5"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Remember & Encryption Row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-emerald-700 border-slate-300"
                      {...register('remember')}
                    />
                    <span className="text-slate-600 text-xs">Remember session on this device</span>
                  </label>
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    SSO Encrypted
                  </span>
                </div>

                {/* Primary Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-4 bg-[#046c4e] hover:bg-[#03583f] text-white font-semibold py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                  loading={busy}
                >
                  <span>Sign in as Student</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              {/* Institutional Notice Box */}
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px] text-slate-600">
                  <strong className="text-slate-800">Institutional Enrollment Notice:</strong> Accounts are pre-provisioned by Maatram Foundation administrators. If your college cohort was recently admitted, reach out to your Institutional Officer for roster activation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── GLOBAL COMPLIANCE FOOTER ── */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="space-y-0.5 text-center md:text-left">
          <p className="font-semibold text-slate-700">Maatram Educational & Charitable Trust</p>
          <p className="text-[11px]">Accredited Student Empowerment Program • ISO 9001:2015 Institutional Compliance</p>
          <p className="text-[10px] text-slate-400">All authentication sessions are encrypted and monitored under strict Foundation security protocols.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-600 font-medium">
          <button type="button" onClick={() => openLegal('privacy')} className="hover:text-slate-900 transition cursor-pointer">
            Privacy Policy
          </button>
          <button type="button" onClick={() => openLegal('terms')} className="hover:text-slate-900 transition cursor-pointer">
            Terms of Service
          </button>
          <button type="button" onClick={() => openLegal('security')} className="hover:text-slate-900 transition cursor-pointer">
            Security Assurance
          </button>
          <button type="button" onClick={() => openLegal('support')} className="hover:text-slate-900 transition cursor-pointer">
            Institutional Support
          </button>
        </div>
      </footer>

      {/* ── MODALS ── */}
      <AboutMaatramModal open={aboutOpen} onOpenChange={setAboutOpen} />
      <PortalSetupModal open={setupOpen} onOpenChange={setSetupOpen} portalName="Student Portal" />
      <LegalInfoModal open={legalOpen} onOpenChange={setLegalOpen} initialTab={legalTab} />

      {/* Forgot Password Modal */}
      <Modal
        open={forgot}
        onOpenChange={setForgot}
        title="Reset Student Password"
        description="Enter your registered student email address to receive password recovery instructions."
        footer={
          <>
            <Button variant="outline" onClick={() => setForgot(false)}>
              Cancel
            </Button>
            {!forgotSent && (
              <Button
                className="bg-[#046c4e] hover:bg-[#03583f] text-white"
                loading={forgotBusy}
                disabled={!forgotEmail || !forgotEmail.includes('@')}
                onClick={handleForgotPassword}
              >
                Send Reset Link
              </Button>
            )}
          </>
        }
      >
        {forgotSent ? (
          <div className="space-y-3 py-2">
            <Notice tone="success" title="Recovery Email Dispatched">
              If an active student account exists for <strong>{forgotEmail}</strong>, password reset instructions have been delivered to your inbox.
            </Notice>
            <p className="text-xs text-slate-500">
              Please check your spam/junk folder if you don't see it within 2 minutes. The link expires in 1 hour.
            </p>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="py-2 space-y-3">
            <Field label="Registered Email Address" htmlFor="fe">
              <input
                id="fe"
                type="email"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                placeholder="name@student.example"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
