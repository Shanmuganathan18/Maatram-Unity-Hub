import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useState } from 'react';
import { Camera, CheckCircle2, Circle, Lock, Mail, Trash2 } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, Field, Notice, PageHeader, Progress } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/useStore';
import { getCompleteness, updateProfile } from '../services/profileService';
import { profileSchema } from '../utils/validators';
import { appConfig } from '../config/appConfig';

export default function Profile() {
  usePageTitle('My profile');
  const { sid, student } = useAuth();
  const [photo, setPhoto] = useState(student.photoUrl);
  const fileRef = useRef(null);
  const { register, handleSubmit, formState: { errors, isDirty, isSubmitting }, reset } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { phone: student.phone, alternateEmail: student.alternateEmail } });
  const comp = getCompleteness({ ...student, photoUrl: photo });
  const onPhoto = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Please choose an image file.'); return; }
    if (f.size > 1024 * 1024) { toast.error('Image must be under 1 MB.'); return; }
    const r = new FileReader(); r.onload = () => setPhoto(r.result); r.readAsDataURL(f);
  };
  const onSubmit = async (v) => { await updateProfile(sid, { ...v, photoUrl: photo }); reset(v); toast.success('Profile updated.'); };
  const photoChanged = photo !== student.photoUrl;
  const account = [['Student name', student.name], ['Student ID', student.studentId], ['Email', student.email], ['Institution', student.institution], ['Department', student.department], ['Year of study', `Year ${student.year}`], ['Assigned zone', student.zone]];

  return (
    <>
      <PageHeader title="My profile" subtitle="Account details are assigned by Maatram. You can update your contact details and photo." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card id="photo">
            <CardHeader title="Profile photo" />
            <div className="flex items-center gap-4"><Avatar student={{ ...student, photoUrl: photo }} size="h-20 w-20 text-2xl" />
              <div className="flex flex-wrap gap-2"><input ref={fileRef} type="file" accept="image/*" className="sr-only" id="photo-input" onChange={onPhoto} /><Button variant="outline" size="sm" onClick={() => fileRef.current.click()}><Camera className="h-4 w-4" />Choose photo</Button>{photo && <Button variant="ghost" size="sm" onClick={() => setPhoto(null)}><Trash2 className="h-4 w-4" />Remove</Button>}</div></div>
            <p className="mt-2 text-xs text-ink-mute">Photos stay in this browser session only in the prototype. Max 1 MB.</p>
          </Card>

          <Card id="contact">
            <CardHeader title="Contact details (editable)" />
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone number" htmlFor="phone" error={errors.phone?.message} hint="10-digit mobile number"><input id="phone" inputMode="tel" className="field" aria-invalid={!!errors.phone} {...register('phone')} /></Field>
              <Field label="Alternate email (optional)" htmlFor="alt" error={errors.alternateEmail?.message}><input id="alt" type="email" className="field" aria-invalid={!!errors.alternateEmail} {...register('alternateEmail')} /></Field>
              <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={isSubmitting} disabled={!isDirty && !photoChanged}>Save changes</Button><Button variant="outline" onClick={() => { reset(); setPhoto(student.photoUrl); }} disabled={!isDirty && !photoChanged}>Cancel</Button></div>
            </form>
          </Card>

          <Card>
            <CardHeader icon={Lock} title="Account information (assigned)" />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">{account.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase text-ink-mute">{k}</dt><dd className="font-medium text-navy">{v}</dd></div>)}</dl>
            <Notice tone="neutral" icon={Mail} className="mt-4">To change your institution, department, year or zone, contact your coordinator: <b>{student.coordinator}</b> – <a className="font-semibold underline" href={`mailto:${appConfig.support.email}`}>{appConfig.support.email}</a>.</Notice>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Profile completeness" action={<span className="font-bold text-navy">{comp.percent}%</span>} />
          <Progress value={comp.percent} label="Profile completeness" />
          <p className="mb-2 mt-3 text-xs text-ink-soft">Missing optional items never block availability submission.</p>
          <ul className="space-y-2 text-sm">{comp.items.map((i) => (
            <li key={i.id} className="flex items-center gap-2">{i.done ? <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-label="Done" /> : <Circle className="h-4 w-4 text-ink-mute" aria-label="Missing" />}
              <span className={i.done ? 'text-ink-soft' : 'font-semibold'}>{i.label}</span>
              <Badge className="ml-auto border-lavender-300 bg-lavender-50 text-ink-soft">{i.account ? 'Account' : i.required ? 'Recommended' : 'Optional'}</Badge>
              {!i.done && i.section && <a className="text-xs font-semibold text-brand-700 underline" href={`#${i.section}`}>Fix</a>}</li>))}</ul>
        </Card>
      </div>
    </>
  );
}
