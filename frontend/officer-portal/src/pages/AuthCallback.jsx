import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
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
          portal: 'officer',
        });

        if (!active) return;

        if (res.data?.user) {
          api.setToken(session.access_token);
          const officerUser = res.data.user;
          const targetId = officerUser?.profile?.id || officerUser?.id || 'google-officer';
          signIn(targetId, officerUser);
          if (officerUser.mustChangePassword) {
            navigate('/change-password', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          throw new Error('Officer profile verification failed.');
        }
      } catch (err) {
        if (!active) return;
        setIsProcessing(false);
        setErrorMsg(err.message || 'Access denied: You are not authorized as an Officer.');
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          await exchangeAndVerify(session);
        } else {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (currentSession?.access_token) {
              subscription.unsubscribe();
              await exchangeAndVerify(currentSession);
            }
          });

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
            <h2 className="text-xl font-bold text-navy">Authenticating Officer...</h2>
            <p className="text-sm text-ink-soft">
              Verifying your zonal credentials and permissions with Maatram servers.
            </p>
          </div>
        ) : (
          <div className="space-y-5 text-left">
            <Notice tone="danger" title="Authorization Failed">
              {errorMsg}
            </Notice>
            <p className="text-xs text-ink-soft leading-relaxed">
              Note: Officer accounts cannot be created by signing in with Google. Your account must first be created and invited by an Administrator.
            </p>
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

