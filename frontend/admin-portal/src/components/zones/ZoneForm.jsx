import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field } from '../ui';
import { zoneSchema } from '../../utils/validators';
import { useAction } from '../../hooks/useAction';

export default function ZoneForm({ initial, onSubmit, onCancel, submitLabel = 'Save zone', lockStatus }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(zoneSchema), defaultValues: { name: '', code: '', region: '', description: '', status: 'Active', ...initial } });
  const [run, busy] = useAction();
  return (
    <form onSubmit={handleSubmit((v) => run(() => onSubmit(v)))} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Zone name *" htmlFor="zn" error={errors.name?.message}><input id="zn" className="field" {...register('name')} /></Field>
        <Field label="Zone code *" htmlFor="zc" error={errors.code?.message} hint="e.g. ZN-E (unique)"><input id="zc" className="field uppercase" {...register('code')} /></Field>
        <Field label="Region *" htmlFor="zr" error={errors.region?.message}><input id="zr" className="field" {...register('region')} /></Field>
        <Field label="Status" htmlFor="zs" hint={lockStatus ? 'Change status from the zone page.' : undefined}><select id="zs" className="field" disabled={lockStatus} {...register('status')}><option>Active</option><option>Inactive</option></select></Field>
      </div>
      <Field label="Description" htmlFor="zd"><textarea id="zd" rows={3} className="field" {...register('description')} /></Field>
      <div className="flex justify-end gap-2">{onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}<Button type="submit" loading={busy}>{submitLabel}</Button></div>
    </form>
  );
}
