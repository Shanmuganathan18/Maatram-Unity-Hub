import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound, CheckCircle2, XCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button, Notice } from '../components/ui';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import logo from '../assets/logo.svg';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Check search params or hash for recovery token
    const code = params.get('code');
    const hash = window.location.hash;
    let extractedToken = code || '';

    if (!extractedToken && hash) {
      const match = hash.match(/access_token=([^&]+)/);
      if (match) extractedToken = match[1];
    }

    if (extractedToken) {
      setToken(extractedToken);
    }
  }, [params]);

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
      setErr('Password does not satisfy all policy criteria.');
      return;
    }
    if (!matchesConfirm) {
      setErr('Passwords do not match.');
      return;
    }

    try {
      setBusy(true);

      // Attempt Supabase client session update first
      const { error: sbErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (sbErr) {
        // Fallback to backend reset endpoint with token
        await api.post('/auth/reset-password', {
          token: token || api.getToken(),
          newPassword,
        });
      }

      toast.success('Your password has been successfully reset. Please sign in.');
      navigate('/login', { replace: true });
    } catch (apiErr) {
      setErr(apiErr.message || 'Unable to reset password. The link may have expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-navy to-slate-950 text-slate-800">
      <div className="w-full max-w-md card p-6 sm:p-8 bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="Maatram Foundation" className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-extrabold text-navy">Set New Password</h1>
            <p className="text-xs text-slate-500">Student Account Recovery</p>
          </div>
        </div>

        {err && (
          <Notice tone="danger" className="mb-4">
            {err}
          </Notice>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="newp">New Password</label>
            <div className="relative">
              <input
                id="newp"
                type={showNew ? 'text' : 'password'}
                className="field pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
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
              placeholder="Re-enter new password"
              required
            />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
            <p className="font-semibold text-slate-700">Password Checklist:</p>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <span className={hasMinLength ? 'text-emerald-700' : 'text-slate-400'}>&bull; 8+ Characters</span>
              <span className={hasUppercase ? 'text-emerald-700' : 'text-slate-400'}>&bull; 1 Uppercase</span>
              <span className={hasLowercase ? 'text-emerald-700' : 'text-slate-400'}>&bull; 1 Lowercase</span>
              <span className={hasNumber ? 'text-emerald-700' : 'text-slate-400'}>&bull; 1 Number</span>
              <span className={hasSpecial ? 'text-emerald-700' : 'text-slate-400'}>&bull; 1 Special Char</span>
              <span className={matchesConfirm ? 'text-emerald-700' : 'text-slate-400'}>&bull; Passwords Match</span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full mt-2"
            disabled={!isValidPolicy || !matchesConfirm}
            loading={busy}
          >
            Reset Password & Sign In <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </form>
      </div>
    </div>
  );
}

