import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  Info,
  ArrowRight,
  TrendingUp,
  BookOpen,
  Compass,
  Radio,
  FileCheck2,
  Network
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
  usePageTitle('Officer Portal Sign In');
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
  const [networkGridOpen, setNetworkGridOpen] = useState(false);

  // Forgot password modal state
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const [loginError, setLoginError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
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

        toast.success(`Welcome back, Officer ${user.profile?.name || user.email}!`);

        const destination = user.mustChangePassword ? '/change-password' : (loc.state?.from ?? '/dashboard');
        setTimeout(() => {
          window.location.href = destination;
        }, 200);
        return;
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid officer credentials. Please verify your official email and password.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      toast.error('Please enter a valid official officer email address.');
      return;
    }

    try {
      setForgotBusy(true);
      await api.post('/auth/forgot-password', {
        email: forgotEmail.trim(),
        portal: 'officer',
      });
      setForgotSent(true);
      toast.success('Officer password reset instructions delivered to your email.');
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* ── TOP HEADER (Brand & Global Utilities) ── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Maatram Foundation Brand Logo" className="h-10 w-10 rounded-xl shadow-sm" />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-none">
              Maatram Foundation
            </span>
            <span className="text-[10px] font-bold tracking-widest text-[#0f766e] uppercase mt-1">
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
            title="Institutional Officer Portal"
            className="w-8 h-8 rounded-full bg-[#0f766e] text-white flex items-center justify-center font-bold text-xs shadow-sm"
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* ── MAIN FLOATING CARD CONTAINER ── */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-auto py-4">
        <div className="rounded-3xl overflow-hidden shadow-2xl shadow-slate-300/60 border border-slate-200/90 bg-white grid lg:grid-cols-12">
          {/* ── LEFT HERO PANEL: Slate Cyan-Teal Identity ── */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0a2233] via-[#091e2e] to-[#061520] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Ambient cyan/teal radial glow */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Top Row: Institutional coordination & Zonal node badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 border border-white/10 text-[11px] font-semibold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate">INSTITUTIONAL & ZONE COORDINATION</span>
                </div>

                <div className="text-xs text-sky-300 font-mono flex items-center gap-1 shrink-0 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10">
                  <Radio className="w-3 h-3 text-sky-400" />
                  <span>Node: Zone-TN-Central</span>
                </div>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mt-6">
                Coordinate people.<br />
                <span className="text-[#34d399]">Create opportunities.</span>
              </h1>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-4">
                Manage student availability, coordinate institutional programmes, and keep your assigned zone connected through one unified operational workspace.
              </p>

              {/* Active Operational Telemetry Box */}
              <div className="mt-6 rounded-2xl bg-slate-900/60 border border-white/10 p-4">
                <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-300 uppercase mb-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ACTIVE OPERATIONAL TELEMETRY</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-medium border border-cyan-400/30">
                    Live Synced
                  </span>
                </div>

                {/* 3 KPI columns */}
                <div className="grid grid-cols-3 gap-2 text-center border-b border-white/10 pb-3">
                  <div>
                    <p className="text-xl font-extrabold text-white">24</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Institutional Hubs</p>
                  </div>
                  <div className="border-x border-white/10">
                    <p className="text-xl font-extrabold text-white">98.4%</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">On-Time Availability</p>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-white">4,200+</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cohort Scholars</p>
                  </div>
                </div>

                {/* Trajectory & Sparkline */}
                <div className="pt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-slate-300">Zonal Validation Trajectory</span>
                    <span className="text-emerald-400 font-semibold">+18.2% vs previous term</span>
                  </div>

                  {/* Sparkline curve */}
                  <div className="h-9 w-full">
                    <svg viewBox="0 0 200 36" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="officerCurveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,30 Q30,26 50,22 T100,16 T150,18 T200,6 L200,36 L0,36 Z"
                        fill="url(#officerCurveGrad)"
                      />
                      <path
                        d="M0,30 Q30,26 50,22 T100,16 T150,18 T200,6"
                        fill="none"
                        stroke="#2dd4bf"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Zonal Lead Quote Card */}
            <div className="relative z-10 mt-6 space-y-4">
              <div className="rounded-2xl bg-black/25 border border-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-2.5">
                  <span className="text-cyan-400 font-serif text-2xl font-bold leading-none select-none">“</span>
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-200 italic leading-relaxed">
                      Empowering officers with real-time cohort visibility ensures no student is overlooked for opportunities.
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      — Zonal Operations Lead, Tamil Nadu Directorate
                    </p>
                  </div>
                </div>
              </div>

              {/* Handbook and Field Desk Links */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSetupOpen(true)}
                  className="hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Zone Dispatch Handbook v4.2</span>
                </button>
                <button
                  type="button"
                  onClick={() => openLegal('support')}
                  className="hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-teal-400" />
                  <span>Field Coordination Desk</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT FORM PANEL: Officer Authentication ── */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              {/* Header Badges: Authentication Gateway & Tier Level */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-semibold tracking-wide">
                  <Building2 className="w-3.5 h-3.5 text-sky-700" />
                  <span>AUTHENTICATION GATEWAY</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                  Officer Level-2
                </span>
              </div>

              {/* Form Title & Subtitle */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                Officer Portal Sign In
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter your authorized institutional or zonal officer credentials to access planning grids and batch student schedules.
              </p>

              {/* Login Error Notification */}
              {loginError && (
                <Notice tone="danger" className="my-4 text-xs font-semibold">
                  {loginError}
                </Notice>
              )}

              {/* Sign In Form - Only Login Method */}
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
                {/* Field 1: Institutional Email */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <label htmlFor="officer-email">Institutional Email Address</label>
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Institutional Domain Only
                    </span>
                  </div>
                  <div className="relative">
                    <span className="text-slate-400 font-semibold text-sm absolute left-3.5 top-2.5">@</span>
                    <input
                      id="officer-email"
                      type="email"
                      autoComplete="username"
                      placeholder="officer.chennai-central@maatramfoundation.org"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition"
                      aria-invalid={!!errors.email}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Field 2: Secure Password */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <label htmlFor="officer-password">Secure Password</label>
                    <span className="text-[11px] text-slate-400 font-normal">Min. 12 Characters</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="officer-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition"
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

                {/* Remember & Forgot Row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-[#0f766e] border-slate-300"
                      {...register('remember')}
                    />
                    <span className="text-slate-600 text-xs">Remember this operational terminal for 14 days</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setForgot(true); setForgotSent(false); }}
                    className="text-[11px] font-semibold text-[#0f766e] hover:text-[#0b5f58] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-4 bg-[#046c4e] hover:bg-[#03553e] text-white font-semibold py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                  loading={busy}
                >
                  <span>Sign in as Officer</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              {/* Institutional Access Policy Box */}
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                  <span>Institutional Access Policy</span>
                </div>
                <p className="leading-relaxed text-[11px] text-slate-600">
                  Zone-level data access is audited under ISO 9001:2015 Foundation standards. Authorized institutional officers only. For zone reassignment or new college onboarding, contact Platform Administration.
                </p>
              </div>

              {/* Bottom Operational Cluster Status */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  All 4 Regional Clusters Online
                </span>
                <span className="font-mono text-slate-400">Auth Protocol v3.8-TLS</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── FLOATING ACTIVE COLLEGE OPERATIONS NETWORK BANNER ── */}
        <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
              <Network className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Active College Operations Network</p>
              <p className="text-[11px] text-slate-500">
                Institutional cohorts currently synchronized across Chennai, Coimbatore, Madurai & Tiruchirappalli zones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Avatar stack */}
            <div className="flex -space-x-1.5 overflow-hidden">
              <span className="inline-block h-6 w-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center border-2 border-white">CH</span>
              <span className="inline-block h-6 w-6 rounded-full bg-slate-300 text-slate-700 font-bold text-[9px] flex items-center justify-center border-2 border-white">CE</span>
              <span className="inline-block h-6 w-6 rounded-full bg-slate-400 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white">MC</span>
              <span className="inline-block h-6 w-6 rounded-full bg-teal-800 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white">+21</span>
            </div>

            <button
              type="button"
              onClick={() => setNetworkGridOpen(true)}
              className="text-xs font-semibold text-[#0f766e] hover:text-[#0b5f58] hover:underline flex items-center gap-0.5 ml-2 cursor-pointer"
            >
              <span>View Network Grid</span>
              <ArrowRight className="w-3 h-3" />
            </button>
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
      <PortalSetupModal open={setupOpen} onOpenChange={setSetupOpen} portalName="Officer Portal" />
      <LegalInfoModal open={legalOpen} onOpenChange={setLegalOpen} initialTab={legalTab} />

      {/* Network Grid Modal */}
      <Modal
        open={networkGridOpen}
        onOpenChange={setNetworkGridOpen}
        size="md"
        title="Active Institutional Network Grid"
        description="Regional zones and partner academic clusters currently synchronized in real time."
        footer={
          <Button variant="primary" onClick={() => setNetworkGridOpen(false)}>
            Close Grid
          </Button>
        }
      >
        <div className="space-y-3 py-2 text-xs text-slate-600">
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
            <p className="font-bold text-teal-900">Tamil Nadu Central & Regional Operations</p>
            <p className="text-[11px] text-teal-800">
              Covers 4 operational clusters: Zone A (Chennai & Thiruvallur), Zone B (Coimbatore & Tiruppur), Zone C (Madurai & Southern Districts), Zone D (Salem & Western Region).
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-800">Key Partner Institutions:</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
              <li>Coimbatore Institute of Technology (CIT) — Zone B</li>
              <li>Sri Vidya Institute of Technology (SVIT) — Zone A</li>
              <li>Marina College of Engineering (MCE) — Zone A</li>
              <li>Nilgiri College of Arts & Science (NCAS) — Zone B</li>
              <li>Vaigai College of Engineering (VCET) — Zone C</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        open={forgot}
        onOpenChange={setForgot}
        title="Reset Officer Password"
        description="Enter your registered official officer email address. We will verify your account and send a secure reset link."
        footer={
          <>
            <Button variant="outline" onClick={() => setForgot(false)}>
              Cancel
            </Button>
            {!forgotSent && (
              <Button
                className="bg-[#046c4e] hover:bg-[#03553e] text-white"
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
              If an active officer account exists for <strong>{forgotEmail}</strong>, password reset instructions have been delivered to your official inbox.
            </Notice>
            <p className="text-xs text-slate-500">
              Please check your inbox or official spam filter. The recovery link expires in 1 hour.
            </p>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="py-2 space-y-3">
            <Field label="Registered Officer Email" htmlFor="fe">
              <input
                id="fe"
                type="email"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                placeholder="officer@maatramfoundation.org"
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
