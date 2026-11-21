import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldAlert, Lock, CheckCircle2, XCircle, ArrowRight, Eye, EyeOff, LogIn } from 'lucide-react';
import { Button, Notice } from '../components/ui';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.svg';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { student, signIn } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const hasToken = Boolean(api.getToken());

  useEffect(() => {
    if (!api.getToken()) {
      toast.error('Session not found. Please sign in with your email and temporary password first.');
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Password policy checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const matchesConfirm = newPassword.length > 0 && newPassword === confirmPassword;
  const isValidPolicy = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!api.getToken()) {
      setErr('Authentication token missing. Please sign in first with your email and temporary password.');
      navigate('/login', { replace: true });
      return;
    }

    if (!currentPassword) {
      setErr('Please enter your current temporary password.');
      return;
    }

    if (!isValidPolicy) {
      setErr('New password does not meet all security policy requirements.');
      return;
    }

    if (!matchesConfirm) {
      setErr('New password and confirmation do not match.');
      return;
    }

    try {
      setBusy(true);
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      toast.success('Password updated successfully! Welcome to your student portal.');

      // Update cached profile in storage
      const currentTargetId = student?.id || student?.studentId || 'student-user';
      const updated = {
        ...(student || {}),
        id: currentTargetId,
        mustChangePassword: false,
      };
      signIn(currentTargetId, updated);

      // Clean redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 300);
    } catch (apiErr) {
      if (apiErr.status === 401 || apiErr.message?.toLowerCase().includes('token')) {
        setErr('Your session has expired. Please log in with your temporary password on the login page.');
      } else {
        setErr(apiErr.message || 'Failed to update password. Please check your current password.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-navy to-slate-950 text-slate-800">
      <div className="w-full max-w-lg card p-6 sm:p-8 bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="Maatram Foundation" className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-extrabold text-navy">Update Your Password</h1>
            <p className="text-xs text-slate-500">First Login Security Setup</p>
          </div>
        </div>

        <Notice tone="warn" icon={ShieldAlert} className="mb-6">
          <strong>Security Action Required:</strong> Your account was provisioned with a temporary password. You must set a personal, secure password before accessing your student portal.
        </Notice>

        {err && (
          <Notice tone="danger" className="mb-4">
            {err}
          </Notice>
        )}

        {!hasToken ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
              <p className="font-bold mb-1">Sign-in Required Before Password Setup</p>
              <p className="text-amber-800">
                To set your new password, you must first sign in with your registered student email and the temporary password (<code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">Maatram@2026</code>) on the login page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-[#046c4e] hover:bg-[#03543d] transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in on Student Login Page &rarr;</span>
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="curr">Current / Temporary Password</label>
            <div className="relative">
              <input
                id="curr"
                type={showCurr ? 'text' : 'password'}
                className="field pr-10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter initial temporary password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurr(!showCurr)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showCurr ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="newp">New Password</label>
            <div className="relative">
              <input
                id="newp"
                type={showNew ? 'text' : 'password'}
                className="field pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Set your new strong password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="conf">Confirm New Password</label>
            <input
              id="conf"
              type="password"
              className="field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              required
            />
          </div>

          {/* Password Policy Requirements Checklist */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
            <p className="font-bold text-slate-700">Password Policy Requirements:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700' : 'text-slate-500'}`}>
                {hasMinLength ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-700' : 'text-slate-500'}`}>
                {hasUppercase ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                <span>1 Uppercase letter (A–Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-700' : 'text-slate-500'}`}>
                {hasLowercase ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                <span>1 Lowercase letter (a–z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700' : 'text-slate-500'}`}>
                {hasNumber ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                <span>1 Number (0–9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700' : 'text-slate-500'}`}>
                {hasSpecial ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                <span>1 Special character (!@#$)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${matchesConfirm ? 'text-emerald-700' : 'text-slate-500'}`}>
                {matchesConfirm ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full mt-4"
            disabled={!isValidPolicy || !matchesConfirm || !currentPassword}
            loading={busy}
          >
            Update Password & Enter Dashboard <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </form>
        )}
      </div>
    </div>
  );
}

