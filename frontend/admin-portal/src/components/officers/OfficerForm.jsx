import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Mail } from 'lucide-react';
import { Button, Field } from '../ui';
import { officerSchema } from '../../utils/validators';
import { useAction } from '../../hooks/useAction';
import { getState } from '../../services/store';

export default function OfficerForm({ initial, onSubmit, onCancel, submitLabel, editing }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(officerSchema),
    defaultValues: { name: '', email: '', phone: '', officerId: '', designation: '', zoneId: '', ...initial },
  });
  const [run, busy] = useAction();
  const zones = getState().zones.filter((z) => z.status === 'Active');

  return (
    <form onSubmit={handleSubmit((v) => run(() => onSubmit(v)))} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name *" htmlFor="on" error={errors.name?.message}>
          <input id="on" className="field" {...register('name')} />
        </Field>
        <Field label="Email *" htmlFor="oe" error={errors.email?.message}>
          <input id="oe" type="email" className="field" {...register('email')} />
        </Field>
        <Field label="Phone *" htmlFor="op" error={errors.phone?.message}>
          <input id="op" inputMode="tel" className="field" {...register('phone')} />
        </Field>
        <Field label="Officer ID *" htmlFor="oi" error={errors.officerId?.message} hint={editing ? 'Officer ID cannot be changed.' : 'e.g. OFF-D-001'}>
          <input id="oi" className="field uppercase" readOnly={editing} {...register('officerId')} />
        </Field>
        <Field label="Designation *" htmlFor="od" error={errors.designation?.message}>
          <select id="od" className="field" {...register('designation')}>
            <option value="">Select…</option>
            <option>Zone In-charge</option>
            <option>Zone Officer</option>
          </select>
        </Field>
        {!editing && (
          <Field label="Assigned zone" htmlFor="oz" hint="Optional now; zone changes later use the reassignment workflow.">
            <select id="oz" className="field" {...register('zoneId')}>
              <option value="">Unassigned</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} • {z.region}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3.5 text-xs text-indigo-900 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-indigo-950">
          <KeyRound className="h-4 w-4 text-indigo-700" />
          <span>Account Credentials & Email Dispatch</span>
        </div>
        <p>
          Initial Temporary Password: <code className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-mono font-bold text-indigo-700 select-all">Maatram@2026</code>
        </p>
        <p className="text-[11px] text-indigo-700 flex items-center gap-1">
          <Mail className="h-3 w-3 shrink-0" />
          Saving will automatically send an official activation email with login instructions (<code className="text-indigo-800">http://localhost:5174/login</code>) to the officer's email.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} type="button">
            Cancel
          </Button>
        )}
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
