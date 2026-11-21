import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field } from '../ui';
import { institutionSchema } from '../../utils/validators';
import { useAction } from '../../hooks/useAction';
import { getState } from '../../services/store';
import { zoneChangeImpact } from '../../services/institutionService';
import { institutionTypes } from '../../services/institutionService';

export default function InstitutionForm({ initial, id, onSubmit, onCancel, submitLabel }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(institutionSchema), defaultValues: { name: '', code: '', zoneId: '', location: '', type: 'Engineering', contactName: '', contactEmail: '', contactPhone: '', departmentsText: '', status: 'Active', ...initial } });
  const [run, busy] = useAction(); const zones = getState().zones.filter((z) => z.status === 'Active'); const zid = watch('zoneId'); const moved = id && zid ? zoneChangeImpact(id, zid).students : 0;
  const types = [...new Set([...institutionTypes(), 'Engineering', 'Management', 'Arts & Science', 'Polytechnic'])];
  return (
    <form onSubmit={handleSubmit((v) => run(() => onSubmit({ ...v, departments: v.departmentsText.split(',').map((x) => x.trim()).filter(Boolean) })))} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Institution name *" htmlFor="in" error={errors.name?.message}><input id="in" className="field" {...register('name')} /></Field>
        <Field label="Institution code *" htmlFor="ic" error={errors.code?.message} hint="Unique, e.g. SVIT"><input id="ic" className="field uppercase" {...register('code')} /></Field>
        <Field label="Zone *" htmlFor="iz" error={errors.zoneId?.message}><select id="iz" className="field" {...register('zoneId')}><option value="">Select zone…</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name} • {z.region}</option>)}</select></Field>
        <Field label="Location *" htmlFor="il" error={errors.location?.message}><input id="il" className="field" {...register('location')} /></Field>
        <Field label="Type" htmlFor="it"><select id="it" className="field" {...register('type')}>{types.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Status" htmlFor="is"><select id="is" className="field" {...register('status')}><option>Active</option><option>Onboarding</option><option>Inactive</option></select></Field>
        <Field label="Contact person" htmlFor="icn"><input id="icn" className="field" {...register('contactName')} /></Field>
        <Field label="Contact email" htmlFor="ice" error={errors.contactEmail?.message}><input id="ice" type="email" className="field" {...register('contactEmail')} /></Field>
        <Field label="Contact phone" htmlFor="icp" error={errors.contactPhone?.message}><input id="icp" inputMode="tel" className="field" {...register('contactPhone')} /></Field>
        <Field label="Departments * (comma separated)" htmlFor="idp" error={errors.departmentsText?.message}><input id="idp" className="field" {...register('departmentsText')} /></Field>
      </div>
      {moved > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Changing the zone also moves this institution’s <b>{moved}</b> student(s) to the new zone (students always follow their institution). Officers of the old zone lose access to them.</p>}
      <div className="flex justify-end gap-2">{onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}<Button type="submit" loading={busy}>{submitLabel}</Button></div>
    </form>
  );
}
