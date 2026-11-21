import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Lock,
  User,
  Info,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Terminal,
  FileText
} from 'lucide-react';
import { loginSchema } from '../utils/validators';
import { Button, Field, Modal, Notice } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/useStore';
import { supabase } from '../services/supabase';
import { api } from '../services/api';
import AboutMaatramModal from '../components/auth/AboutMaatramModal';
import LegalInfoModal from '../components/auth/LegalInfoModal';
import PortalSetupModal from '../components/auth/PortalSetupModal';
import logo from '../assets/logo.svg';

export default function Login() {
  usePageTitle('Administrator Sign In');
  const { signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

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
    defaultValues: { email: 'hemeshkumar576@gmail.com', password: '', remember: true },
  });

  const onSubmit = async ({ email, password }) => {
    setLoginError('');
    setBusy(true);

    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      if (res?.data?.accessToken) {
        api.setToken(res.data.accessToken);
        const user = res.data.user;
        const targetId = user.profile?.id || user.id;
        signIn(targetId, user);

        toast.success(`Welcome back, ${user.profile?.name || user.email}!`);

        const destination = user.mustChangePassword ? '/change-password' : (loc.state?.from ?? '/dashboard');
        setTimeout(() => {
          window.location.href = destination;
        }, 200);
        return;
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid administrator credentials. Access restricted to authorized personnel.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleBusy(true);
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        toast.error(error.message || 'Failed to initiate Google sign-in');
        setGoogleBusy(false);
      }
    } catch (err) {
      toast.error(err.message || 'Google sign-in error');
      setGoogleBusy(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      toast.error('Please enter a valid administrator email address.');
      return;
    }

    try {
      setForgotBusy(true);
      await api.post('/auth/forgot-password', {
        email: forgotEmail.trim(),
        portal: 'admin',
      });
      setForgotSent(true);
      toast.success('Admin password reset instructions dispatched to your email.');
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
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col justify-between antialiased selection:bg-teal-100 selection:text-teal-900 relative overflow-hidden">
      {/* Background radial radiance to eliminate dullness */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-sky-200/50 via-teal-100/30 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* ── TOP HEADER (Brand & Global Utilities) ── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Maatram Foundation Brand Logo" className="h-10 w-10 rounded-xl shadow-sm" />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-none">
              Maatram Foundation
            </span>
            <span className="text-[10px] font-extrabold tracking-widest text-[#0d9488] uppercase mt-1">
              AVAILABILITY PLANNER PORTAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 text-xs font-semibold text-slate-600">
          <span className="text-slate-900 font-bold cursor-pointer">Sign In</span>
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

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden xs:inline">256-Bit SSL Secured</span>
            <span className="xs:hidden">SSL</span>
          </div>

          <div
            title="Administrator Portal"
            className="w-8 h-8 rounded-full bg-[#0a192f] text-white flex items-center justify-center font-bold text-xs shadow-sm"
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* ── MAIN FLOATING CARD CONTAINER ── */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-auto py-4">
        <div className="rounded-3xl overflow-hidden shadow-2xl shadow-slate-400/50 border border-slate-300/80 bg-white grid lg:grid-cols-12">
          {/* ── LEFT HERO PANEL: High-Security Institutional Command ── */}
          <div
            className="lg:col-span-5 bg-gradient-to-br from-[#0c2f42] via-[#092333] to-[#061824] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(45, 212, 191, 0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(45, 212, 191, 0.09) 1px, transparent 1px)`,
              backgroundSize: '28px 28px'
            }}
          >
            {/* Ambient vibrant cyan & sky radiance */}
            <div className="absolute -top-20 -left-20 w-88 h-88 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-88 h-88 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Top Row: Governance pill & Charter link */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0c3842]/90 text-[#5eead4] border border-[#2dd4bf]/40 text-[10px] font-bold tracking-wider shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2dd4bf]" />
                  <span className="truncate">CENTRALIZED PLATFORM GOVERNANCE</span>
                </div>

                <button
                  type="button"
                  onClick={() => setSetupOpen(true)}
                  className="text-xs text-slate-300 hover:text-white transition flex items-center gap-1 shrink-0 font-medium"
                >
                  <span>Foundation Charter</span>
                  <ExternalLink className="w-3 h-3 text-cyan-300" />
                </button>
              </div>

              {/* Category */}
              <p className="mt-8 text-xs font-extrabold tracking-widest text-[#2dd4bf] uppercase">
                INSTITUTIONAL COMMAND
              </p>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-white tracking-tight leading-[1.12] mt-3">
                One platform.<br />
                Every zone.<br />
                <span className="text-[#2dd4bf] drop-shadow-[0_2px_12px_rgba(45,212,191,0.35)]">Complete visibility.</span>
              </h1>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed mt-4 font-normal">
                Oversee statewide admissions, manage multi-district officer deployments, monitor partner college endowments, and preserve absolute data integrity for Maatram scholars.
              </p>

              {/* System State & Telemetry Box */}
              <div className="mt-6 rounded-2xl bg-[#071d2b]/90 border border-[#2dd4bf]/30 p-4 sm:p-5 backdrop-blur-md shadow-lg shadow-black/20">
                <div className="flex items-center justify-between text-[10px] font-extrabold tracking-wider text-slate-300 uppercase mb-3">
                  <span>SYSTEM STATE & RBAC GATE</span>
                  <span className="flex items-center gap-1.5 text-[#34d399] font-bold lowercase text-xs">
                    <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
                    Live & Monitored
                  </span>
                </div>

                {/* 3 KPI columns */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">14</p>
                    <p className="text-[11px] text-slate-300 font-medium mt-0.5">Regional Zones</p>
                  </div>
                  <div className="border-x border-cyan-800/50">
                    <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">3,840+</p>
                    <p className="text-[11px] text-slate-300 font-medium mt-0.5">Active Scholars</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">99.98%</p>
                    <p className="text-[11px] text-slate-300 font-medium mt-0.5">Uptime SLA</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Executive Council Quote Card & Security Badges */}
            <div className="relative z-10 mt-6 space-y-4">
              <div className="rounded-2xl bg-[#061926]/85 border border-[#2dd4bf]/25 p-4 sm:p-5 backdrop-blur-md shadow-sm">
                <div className="flex items-start gap-2.5">
                  <span className="text-[#2dd4bf] font-serif text-3xl font-black leading-none select-none">“</span>
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm text-slate-100 italic leading-relaxed">
                      Accountability and stewardship ensure that every allocated mentorship slot and educational sponsorship directly elevates a deserving student&apos;s lifetime trajectory.
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-cyan-800/40">
                      <span className="font-semibold">— Maatram Executive Council</span>
                      <button
                        type="button"
                        onClick={() => openLegal('terms')}
                        className="text-[#2dd4bf] hover:text-[#5eead4] underline font-bold cursor-pointer"
                      >
                        Governance Charter
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Badges */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-cyan-800/40 gap-2 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2dd4bf]" />
                  SOC-2 Aligned Infrastructure
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#2dd4bf]" />
                  Zero-Trust Executive RBAC
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#2dd4bf]" />
                  Immutable Audit Logs
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGHT FORM PANEL: Administrator Sign In ── */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              {/* Top Row: Tier badges */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0f9ff] text-[#0284c7] border border-[#bae6fd] text-[11px] font-bold tracking-wide uppercase shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>HIGH-SECURITY ADMINISTRATIVE TIER</span>
                </div>
                <span className="px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                  Tier-1 Admin Only
                </span>
              </div>

              {/* Form Title & Subtitle */}
              <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight mt-3">
                Administrator Sign In
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Enter your authorized executive administrative credentials. Unregistered or unauthorized access sessions are automatically terminated.
              </p>

              {/* Zero-Trust Notice Box */}
              <div className="mt-4 p-4 rounded-2xl bg-[#f0f9ff]/90 border border-[#bae6fd] text-xs text-slate-700 space-y-1 shadow-xs">
                <div className="font-bold text-[#0369a1] flex items-center gap-1.5 text-xs">
                  <Terminal className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>Zero-Trust Network Perimeter</span>
                </div>
                <p className="leading-relaxed text-[11px] text-[#0c4a6e]">
                  Your current session and workstation fingerprint (TLS 1.3) will be logged to Foundation Audit Ledger.
                </p>
              </div>

              {/* Login Error Notification */}
              {loginError && (
                <Notice tone="danger" className="my-4 text-xs font-semibold">
                  {loginError}
                </Notice>
              )}

              {/* Sign In Form */}
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-4">
                {/* Field 1: Administrator Email */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <label htmlFor="admin-email">Administrator Email</label>
                    <span className="text-[11px] font-bold text-[#0d9488] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9488]" />
                      @maatramfoundation.org domain required
                    </span>
                  </div>
                  <div className="relative">
                    <span className="text-slate-400 font-bold text-sm absolute left-3.5 top-3">@</span>
                    <input
                      id="admin-email"
                      type="email"
                      autoComplete="username"
                      placeholder="admin@maatramfoundation.org"
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0f172a] focus:ring-2 focus:ring-[#0f172a]/15 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs transition"
                      aria-invalid={!!errors.email}
                      {...register('email')}
                    />
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Field 2: Executive Security Password */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <label htmlFor="admin-password">Executive Security Password</label>
                    <button
                      type="button"
                      onClick={() => { setForgot(true); setForgotSent(false); }}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-950 hover:underline cursor-pointer"
                    >
                      Forgot administrative password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter authorized credential key"
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0f172a] focus:ring-2 focus:ring-[#0f172a]/15 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs transition"
                      aria-invalid={!!errors.password}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition p-0.5"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    ⓘ Min. 14 characters, hardware token or 2FA enforced upon next challenge.
                  </p>
                  {errors.password && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Remember Me Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-[#0f172a] border-slate-300"
                      {...register('remember')}
                    />
                    <span className="text-slate-700 font-medium text-xs">Keep session active on this trusted administrative terminal</span>
                  </label>
                </div>

                {/* Primary Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2 bg-[#0a192f] hover:bg-[#112240] text-white font-bold py-3.5 rounded-xl shadow-md shadow-[#0a192f]/20 hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  loading={busy}
                  disabled={googleBusy}
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Sign in as Administrator</span>
                </Button>

                {/* Divider */}
                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative bg-white px-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    or verify with single sign-on
                  </span>
                </div>

                {/* Google SSO Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center py-3 rounded-xl border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm shadow-xs transition"
                  loading={googleBusy}
                  disabled={busy}
                  onClick={handleGoogleSignIn}
                >
                  <svg viewBox="0 0 48 48" className="h-4 w-4 mr-2.5" aria-hidden>
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.7 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
                    <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
                  </svg>
                  <span>Sign in with Foundation Google Workspace</span>
                </Button>
              </form>

              {/* Security Mandate Warning */}
              <div className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-rose-600">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Restricted Executive Portal. All access attempts are geolocated and recorded under Foundation Security Mandate.</span>
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
      <PortalSetupModal open={setupOpen} onOpenChange={setSetupOpen} portalName="Administrator Portal" />
      <LegalInfoModal open={legalOpen} onOpenChange={setLegalOpen} initialTab={legalTab} />

      {/* Forgot Password Modal */}
      <Modal
        open={forgot}
        onOpenChange={setForgot}
        title="Reset Administrator Password"
        description="Enter your registered official administrator email address. A secure recovery link will be dispatched."
        footer={
          <>
            <Button variant="outline" onClick={() => setForgot(false)}>
              Cancel
            </Button>
            {!forgotSent && (
              <Button
                className="bg-[#0f172a] hover:bg-[#1e293b] text-white"
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
              If an active administrator account exists for <strong>{forgotEmail}</strong>, password reset instructions have been delivered to your executive inbox.
            </Notice>
            <p className="text-xs text-slate-500">
              Please check your inbox or security quarantine. The recovery link expires in 1 hour.
            </p>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="py-2 space-y-3">
            <Field label="Registered Administrator Email" htmlFor="fe">
              <input
                id="fe"
                type="email"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/30"
                placeholder="admin@maatramfoundation.org"
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
