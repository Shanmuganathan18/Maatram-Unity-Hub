import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound, ShieldAlert, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { Button, Notice } from '../components/ui';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { admin, signIn } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Password Policy Checks: Min 8, 1 uppercase, 1 lowercase, 1 number, 1 special char
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

    if (!isValidPolicy) {
      setErr('Password does not meet all security complexity requirements.');
      return;
    }
    if (!matchesConfirm) {
      setErr('New password and confirmation do not match.');
      return;
    }

    if (!api.getToken()) {
      setErr('Your session has expired. Please sign in with your administrator email and temporary password on the login page.');
      navigate('/login', { replace: true });
      return;
    }

    try {
      setBusy(true);
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      // Update local admin session object
      if (admin) {
        const updated = { ...admin, mustChangePassword: false };
        signIn(admin.id, updated);
      }

      toast.success('Your administrator password has been updated successfully!');
      navigate('/dashboard', { replace: true });
    } catch (apiErr) {
      setErr(apiErr.message || 'Failed to update password. Please verify your current temporary password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-slate-800">
      <div className="w-full max-w-md card p-6 sm:p-8 bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl border border-indigo-100">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="Maatram Foundation" className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Change Admin Password</h1>
            <p className="text-xs text-indigo-700 font-medium">Administrator Security Enforcement</p>
          </div>
        </div>

        {admin?.mustChangePassword && (
          <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Temporary Credentials Detected
            </div>
            For administrative integrity and system safety, you must set a permanent private password before accessing executive modules.
          </div>
        )}

        {err && (
          <Notice tone="danger" className="mb-4">
            {err}
          </Notice>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="cur">Current / Temporary Password</label>
            <div className="relative">
              <input
                id="cur"
                type={showCurrent ? 'text' : 'password'}
                className="field pr-10 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="e.g. Maatram@2026"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="newp">New Permanent Password</label>
            <div className="relative">
              <input
                id="newp"
                type={showNew ? 'text' : 'password'}
                className="field pr-10 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter strong admin password"
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
              className="field border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </div>

          {/* Complexity Policy Checklist */}
          <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-3 space-y-1.5 text-xs">
            <p className="font-semibold text-indigo-950">Password Policy Checklist:</p>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <span className={hasMinLength ? 'text-indigo-700 font-medium' : 'text-slate-400'}>&bull; 8+ Characters</span>
              <span className={hasUppercase ? 'text-indigo-700 font-medium' : 'text-slate-400'}>&bull; 1 Uppercase</span>
              <span className={hasLowercase ? 'text-indigo-700 font-medium' : 'text-slate-400'}>&bull; 1 Lowercase</span>
              <span className={hasNumber ? 'text-indigo-700 font-medium' : 'text-slate-400'}>&bull; 1 Number</span>
              <span className={hasSpecial ? 'text-indigo-700 font-medium' : 'text-slate-400'}>&bull; 1 Special Char</span>
              <span className={matchesConfirm ? 'text-indigo-700 font-medium' : 'text-slate-400'}>&bull; Passwords Match</span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/20"
            disabled={busy || !isValidPolicy || !matchesConfirm || !currentPassword}
          >
            {busy ? 'Updating Password...' : 'Save Password & Enter Admin Dashboard'}
          </Button>
        </form>
      </div>
    </div>
  );
}

