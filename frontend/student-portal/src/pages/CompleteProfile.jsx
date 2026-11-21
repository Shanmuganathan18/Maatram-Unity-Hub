import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, UserCheck, AlertCircle, Building2 } from 'lucide-react';
import { Button, Field, Notice } from '../components/ui';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/useStore';
import logo from '../assets/logo.svg';

const profileCompletionSchema = z.object({
  institutionId: z.string().min(1, 'Please select your institution'),
  department: z.string().min(2, 'Department is required').max(100),
  year: z.coerce.number().min(1, 'Year must be between 1 and 5').max(5, 'Year must be between 1 and 5'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210)'),
});

const DEFAULT_DEPARTMENTS = [
  'Computer Science and Engineering',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Biotechnology',
  'Commerce / B.Com',
  'Business Administration / BBA',
  'Science / B.Sc',
  'Arts / B.A',
  'Other',
];

export default function CompleteProfile() {
  usePageTitle('Complete Student Profile');
  const navigate = useNavigate();
  const { signIn, signOut } = useAuth();
  const [token, setToken] = useState(() => sessionStorage.getItem('maatram_student_pending_token'));
  const [pendingUser, setPendingUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('maatram_student_pending_user') || '{}');
    } catch {
      return {};
    }
  });

  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      institutionId: '',
      department: '',
      year: 1,
      phone: '',
    },
  });

  // Guard: if no token exists, send back to login
  useEffect(() => {
    if (!token) {
      toast.error('Session expired. Please sign in with Google again.');
      navigate('/login', { replace: true });
      return;
    }

    const fetchInstitutions = async () => {
      try {
        const res = await api.get('/institutions');
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
        if (list.length > 0) {
          setInstitutions(list.filter((i) => {
            const st = (i.status || '').toUpperCase();
            return st !== 'INACTIVE';
          }));
        } else {
          throw new Error('No institutions returned');
        }
      } catch (err) {
        // Fallback default list matching database institutions if network glitch occurs
        setInstitutions([
          { id: 'inst-cit', name: 'Coimbatore Institute of Technology (CIT)', code: 'CIT' },
          { id: 'inst-a1', name: 'Sri Vidya Institute of Technology', code: 'SVIT' },
          { id: 'inst-a2', name: 'Marina College of Engineering', code: 'MCE' },
          { id: 'inst-a3', name: 'Adyar Institute of Management', code: 'AIM' },
          { id: 'inst-b1', name: 'Nilgiri College of Arts & Science', code: 'NCAS' },
          { id: 'inst-b2', name: 'Noyyal Institute of Technology', code: 'NIT-C' },
          { id: 'inst-b3', name: 'Kovai Engineering College', code: 'KEC' },
          { id: 'inst-c1', name: 'Vaigai College of Engineering', code: 'VCET' },
          { id: 'inst-c2', name: 'Meenakshi Arts College', code: 'MAC' },
          { id: 'inst-c3', name: 'Kanyakumari Engineering College', code: 'KEC-M' },
        ]);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    fetchInstitutions();
  }, [token, navigate]);

  const onSubmit = async (formData) => {
    setSubmitting(true);
    setGeneralError('');
    try {
      const res = await api.post('/auth/complete-student-profile', {
        token,
        institutionId: formData.institutionId,
        department: formData.department,
        year: formData.year,
        phone: formData.phone,
      });

      if (res.data?.user) {
        api.setToken(token);
        const stUser = res.data.user;
        const targetId = stUser.profile?.id || stUser.id || 'google-student';
        sessionStorage.removeItem('maatram_student_pending_token');
        sessionStorage.removeItem('maatram_student_pending_user');
        signIn(targetId, stUser);
        toast.success('Profile completed successfully! Welcome to Maatram.');
        navigate('/dashboard', { replace: true });
      } else {
        throw new Error('Unexpected response while completing profile.');
      }
    } catch (err) {
      setGeneralError(err.message || 'Failed to complete profile. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-xl card p-6 sm:p-8 space-y-6 bg-white shadow-xl rounded-2xl border border-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <img src={logo} alt="Maatram Foundation" className="h-12 w-12" />
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Welcome to Maatram!</h1>
            <p className="text-sm text-ink-soft">Complete your student profile to access availability planning.</p>
          </div>
        </div>

        {generalError && (
          <Notice tone="danger" title="Error">
            {generalError}
          </Notice>
        )}

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center gap-3">
          <UserCheck className="h-6 w-6 text-brand-700 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-brand-900">Signed in as: </span>
            <span className="text-brand-800">{pendingUser.name || 'Google User'}</span>
            <span className="text-brand-600 block text-xs">{pendingUser.email}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Field label="College / Institution" htmlFor="institutionId" error={errors.institutionId?.message}>
            <select
              id="institutionId"
              className="field"
              disabled={loadingInstitutions}
              {...register('institutionId')}
            >
              <option value="">-- Select your institution --</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} {inst.code ? `(${inst.code})` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Department / Degree" htmlFor="department" error={errors.department?.message}>
            <input
              id="department"
              type="text"
              list="dept-options"
              placeholder="e.g. Computer Science and Engineering"
              className="field"
              {...register('department')}
            />
            <datalist id="dept-options">
              {DEFAULT_DEPARTMENTS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Year of Study" htmlFor="year" error={errors.year?.message}>
              <select id="year" className="field" {...register('year')}>
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
                <option value={5}>5th Year</option>
              </select>
            </Field>

            <Field label="Mobile Phone" htmlFor="phone" error={errors.phone?.message}>
              <input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                className="field"
                {...register('phone')}
              />
            </Field>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <Button type="submit" size="lg" className="w-full sm:w-auto flex-1" loading={submitting}>
              <CheckCircle2 className="h-5 w-5 mr-1" />
              Complete Profile & Enter
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

