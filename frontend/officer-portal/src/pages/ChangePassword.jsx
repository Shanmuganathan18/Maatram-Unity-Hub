import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldAlert, CheckCircle2, XCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button, Notice } from '../components/ui';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.svg';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { officer, signIn } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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

    if (!currentPassword) {
      setErr('Please enter your current temporary password.');
      return;
    }
    if (!isValidPolicy) {
      setErr('New password does not meet all policy requirements.');
      return;
    }
    if (!matchesConfirm) {
      setErr('Passwords do not match.');
      return;
    }

    if (!api.getToken()) {
      setErr('Your session has expired. Please sign in with your official email and temporary password on the login page.');
      navigate('/login', { replace: true });
      return;
    }

    try {
      setBusy(true);
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      toast.success('Password updated successfully! Welcome to the Officer Portal.');

      const currentTargetId = officer?.id || officer?.officerId || 'officer-user';
      const updated = { ...(officer || {}), id: currentTargetId, mustChangePassword: false };
      signIn(currentTargetId, updated);

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 300);
    } catch (apiErr) {
      setErr(apiErr.message || 'Failed to update password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4 bg-gradient-to-br from-[#042f2e] via-slate-900 to-black text-slate-800">
      <div className="w-full max-w-lg card p-6 sm:p-8 bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="Maatram Foundation" className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-extrabold text-navy">Update Officer Password</h1>
            <p className="text-xs text-slate-500">First Login Security Setup</p>
          </div>
        </div>

        <Notice tone="warn" icon={ShieldAlert} className="mb-6">
          <strong>Security Action Required:</strong> Your account was provisioned by an Administrator. Please establish a personal secure password before accessing your zone workspace.
        </Notice>

        {err && (
          <Notice tone="danger" className="mb-4">
            {err}
          </Notice>
        )}

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
                placeholder="Set new secure password"
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
            <label className="label" htmlFor="conf">Confirm Password</label>
            <input
              id="conf"
              type="password"
              className="field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
            <p className="font-bold text-slate-700">Password Requirements:</p>
            <div className="grid grid-cols-2 gap-1.5">
              <span className={hasMinLength ? 'text-teal-700' : 'text-slate-500'}>&bull; 8+ Characters</span>
              <span className={hasUppercase ? 'text-teal-700' : 'text-slate-500'}>&bull; 1 Uppercase</span>
              <span className={hasLowercase ? 'text-teal-700' : 'text-slate-500'}>&bull; 1 Lowercase</span>
              <span className={hasNumber ? 'text-teal-700' : 'text-slate-500'}>&bull; 1 Number</span>
              <span className={hasSpecial ? 'text-teal-700' : 'text-slate-500'}>&bull; 1 Special Char</span>
              <span className={matchesConfirm ? 'text-teal-700' : 'text-slate-500'}>&bull; Passwords Match</span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full mt-4"
            disabled={!isValidPolicy || !matchesConfirm || !currentPassword}
            loading={busy}
          >
            Update Password & Enter Workspace <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </form>
      </div>
    </div>
  );
}

