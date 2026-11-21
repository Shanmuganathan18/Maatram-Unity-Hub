import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera, KeyRound, Lock, LogOut, Trash2 } from 'lucide-react';
import { Avatar, Button, Card, CardHeader, Field, Modal, Notice, PageHeader, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/useStore';
import { updateProfile } from '../services/profileService';
import { profileSchema } from '../utils/validators';

export default function Profile() {
  usePageTitle('Profile');
  const { oid, officer, signOut } = useAuth(); const nav = useNavigate(); const fileRef = useRef(null);
  const [photo, setPhoto] = useState(officer.photoUrl); const [pw, setPw] = useState(false); const [p, setP] = useState({ cur: '', n: '', c: '' });
  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { phone: officer.phone } });
  const changed = photo !== officer.photoUrl;
  const onPhoto = (e) => { const f = e.target.files?.[0]; if (!f) return; if (!f.type.startsWith('image/')) return toast.error('Please choose an image file.'); if (f.size > 1024 * 1024) return toast.error('Image must be under 1 MB.'); const r = new FileReader(); r.onload = () => setPhoto(r.result); r.readAsDataURL(f); };
  const save = async (v) => { try { await updateProfile(oid, { phone: v.phone, photoUrl: photo }); reset(v); toast.success('Profile updated.'); } catch (e) { toast.error(e.message); } };
  const pwErr = !p.cur ? 'Enter your current password.' : p.n.length < 8 ? 'New password must be at least 8 characters.' : p.n !== p.c ? 'Passwords do not match.' : '';
  const ro = [['Officer ID', officer.officerId], ['Full name', officer.name], ['Email', officer.email], ['Designation', officer.designation], ['Assigned zone', officer.zoneLabel]];
  return (
    <>
      <PageHeader title="Profile" subtitle="Your zone and role are assigned by the administrator and cannot be changed here." actions={<Button variant="outline" onClick={() => { signOut(); nav('/login', { replace: true }); }}><LogOut className="h-4 w-4" />Logout</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center text-center"><Avatar student={{ ...officer, photoUrl: photo }} size="h-24 w-24 text-3xl" /><h2 className="mt-3 text-lg font-extrabold">{officer.name}</h2><p className="text-sm text-ink-soft">{officer.designation}</p><div className="mt-2"><StatusBadge kind="Active" label={`Account ${officer.status}`} /></div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" id="pimg" onChange={onPhoto} />
          <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => fileRef.current.click()}><Camera className="h-4 w-4" />Photo</Button>{photo && <Button size="sm" variant="ghost" onClick={() => setPhoto(null)}><Trash2 className="h-4 w-4" />Remove</Button>}</div><p className="mt-2 text-xs text-ink-mute">Kept in this browser session only. Max 1 MB.</p></Card>
        <div className="space-y-4 lg:col-span-2">
          <Card><CardHeader icon={Lock} title="Account details (read-only)" /><dl className="grid gap-3 text-sm sm:grid-cols-2">{ro.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase text-ink-mute">{k}</dt><dd className="font-medium text-navy">{v}</dd></div>)}</dl><Notice tone="neutral" className="mt-4">Zone, role and account status come from your authenticated account. Contact an administrator to change them.</Notice></Card>
          <Card><CardHeader title="Contact details (editable)" />
            <form onSubmit={handleSubmit(save)} noValidate className="grid gap-4 sm:grid-cols-2"><Field label="Phone number" htmlFor="ph" error={errors.phone?.message} hint="10-digit mobile number"><input id="ph" inputMode="tel" className="field" aria-invalid={!!errors.phone} {...register('phone')} /></Field>
              <div className="flex items-end gap-2"><Button type="submit" loading={isSubmitting} disabled={!isDirty && !changed}>Save changes</Button><Button variant="outline" disabled={!isDirty && !changed} onClick={() => { reset(); setPhoto(officer.photoUrl); }}>Cancel</Button></div></form></Card>
          <Card><CardHeader icon={KeyRound} title="Password" /><p className="mb-3 text-sm text-ink-soft">Password changes will be handled by Supabase Auth in the integrated app.</p><Button variant="outline" onClick={() => setPw(true)}>Change password</Button></Card>
        </div>
      </div>
      <Modal open={pw} onOpenChange={setPw} title="Change password" description="Prototype entry point – nothing is changed." footer={<><Button variant="outline" onClick={() => setPw(false)}>Close</Button><Button disabled={!!pwErr} onClick={() => { toast.info('Prototype only: password change is not connected yet.'); setPw(false); }}>Submit</Button></>}>
        <div className="space-y-3">{[['cur', 'Current password'], ['n', 'New password'], ['c', 'Confirm new password']].map(([k, l]) => <Field key={k} label={l} htmlFor={`pw-${k}`}><input id={`pw-${k}`} type="password" className="field" value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} autoComplete={k === 'cur' ? 'current-password' : 'new-password'} /></Field>)}{(p.cur || p.n || p.c) && pwErr && <p role="alert" className="text-sm font-medium text-rose-700">{pwErr}</p>}</div></Modal>
    </>
  );
}
