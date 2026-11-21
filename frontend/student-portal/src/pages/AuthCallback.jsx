import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Button, Notice } from '../components/ui';
import logo from '../assets/logo.svg';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { signIn, signOut } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    let active = true;

    const exchangeAndVerify = async (session) => {
      try {
        if (!session?.access_token) {
          throw new Error('No valid authentication token received from Google.');
        }

        const res = await api.post('/auth/google', {
          token: session.access_token,
          portal: 'student',
        });

        if (!active) return;

        if (res.data?.user) {
          api.setToken(session.access_token);
          const studentUser = res.data.user;
          const targetId = studentUser?.profile?.id || studentUser?.id || 'google-student';
          signIn(targetId, studentUser);

          if (studentUser.mustChangePassword) {
            navigate('/change-password', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          throw new Error('Your account has not been registered or approved by Maatram Foundation. Please contact your administrator.');
        }
      } catch (err) {
        if (!active) return;
        setIsProcessing(false);
        setErrorMsg(err.message || 'Failed to complete Google authentication. Please try again.');
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          await exchangeAndVerify(session);
        } else {
          // Listen once for auth state change in case of PKCE or delayed hash parsing
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (currentSession?.access_token) {
              subscription.unsubscribe();
              await exchangeAndVerify(currentSession);
            }
          });

          // Timeout fallback
          setTimeout(() => {
            if (active && isProcessing) {
              setIsProcessing(false);
              setErrorMsg('Authentication session timed out. Please try signing in again.');
            }
          }, 6000);
        }
      } catch (err) {
        if (!active) return;
        setIsProcessing(false);
        setErrorMsg(err.message || 'Google authentication error.');
      }
    };

    initAuth();

    return () => {
      active = false;
    };
  }, [navigate, signIn]);

  const handleReturnToLogin = async () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md card p-8 text-center space-y-6">
        <div className="flex justify-center">
          <img src={logo} alt="Maatram Foundation" className="h-14 w-14" />
        </div>

        {isProcessing ? (
          <div className="space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-brand-600 mx-auto" />
            <h2 className="text-xl font-bold text-navy">Authenticating with Google...</h2>
            <p className="text-sm text-ink-soft">
              Verifying your student credentials with Maatram servers.
            </p>
          </div>
        ) : (
          <div className="space-y-5 text-left">
            <Notice tone="danger" title="Authentication Problem">
              {errorMsg}
            </Notice>
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={handleReturnToLogin}>
                Return to Login
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

