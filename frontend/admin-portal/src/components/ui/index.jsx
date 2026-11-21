import * as Sw from '@radix-ui/react-switch';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { statusMeta } from '../../utils/statusMeta';

export { Button, LinkButton, buttonClasses } from './Button';
export { Modal, ConfirmDialog } from './Dialog';
export { StatCard, SelectField, SearchInput, FilterBar, Tabs, Pagination, DataTable, PendingTag } from './extras';

export const Card = ({ className, children, ...p }) => <section className={cn('card min-w-0 p-4 sm:p-5', className)} {...p}>{children}</section>;

export const CardHeader = ({ icon: Icon, title, action, id }) => (
  <div className="mb-4 flex items-center justify-between gap-3">
    <h2 id={id} className="flex items-center gap-2 text-base font-bold text-navy sm:text-lg">{Icon && <Icon className="h-5 w-5 text-brand-700" aria-hidden />}{title}</h2>
    {action}
  </div>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div><h1 className="text-2xl font-extrabold text-navy sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{subtitle}</p>}</div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Badge = ({ className, children }) => <span className={cn('inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-semibold', className)}>{children}</span>;

/** Icon + text + colour — status is never colour-only. */
export const StatusBadge = ({ kind, label, className }) => {
  const m = statusMeta[kind] ?? statusMeta.none;
  const I = m.icon;
  return <Badge className={cn(m.cls, className)}><I className="h-3.5 w-3.5" aria-hidden />{label ?? m.label}</Badge>;
};

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-lavender-300 bg-lavender-50 px-4 py-8 text-center">
    {Icon && <Icon className="h-8 w-8 text-ink-mute" aria-hidden />}
    <p className="font-semibold text-navy">{title}</p>
    {text && <p className="max-w-sm text-sm text-ink-soft">{text}</p>}
    {action}
  </div>
);

export const Spinner = ({ label = 'Loading…' }) => <div role="status" className="flex items-center justify-center gap-2 py-10 text-ink-soft"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />{label}</div>;

export const Progress = ({ value, label, tone = 'bg-brand-600' }) => (
  <div role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2.5 w-full overflow-hidden rounded-pill bg-lavender-200">
    <div className={cn('h-full rounded-pill transition-all', tone)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

export const Switch = ({ checked, onChange, disabled, label }) => (
  <Sw.Root checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} className="relative h-7 w-12 shrink-0 rounded-pill bg-lavender-300 transition-colors data-[state=checked]:bg-brand-700 disabled:opacity-60">
    <Sw.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-6" />
  </Sw.Root>
);

export const Field = ({ label, htmlFor, error, hint, children }) => (
  <div>
    <label htmlFor={htmlFor} className="label">{label}</label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    {error && <p role="alert" className="mt-1 text-sm font-medium text-rose-700">{error}</p>}
  </div>
);

export const Notice = ({ tone = 'info', icon: Icon, title, children, className }) => {
  const t = { info: 'border-sky-200 bg-sky-50 text-sky-900', warn: 'border-amber-300 bg-amber-50 text-amber-900', danger: 'border-rose-200 bg-rose-50 text-rose-900', ok: 'border-emerald-200 bg-emerald-50 text-emerald-900', neutral: 'border-lavender-300 bg-lavender-50 text-ink' }[tone];
  return <div role="note" className={cn('flex gap-3 rounded-2xl border p-3 text-sm', t, className)}>{Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}<div>{title && <p className="font-bold">{title}</p>}<div>{children}</div></div></div>;
};

export const Avatar = ({ student, size = 'h-12 w-12 text-base' }) => (
  student.photoUrl ? <img src={student.photoUrl} alt={`${student.name} profile`} className={cn('rounded-full object-cover', size)} />
    : <span aria-hidden className={cn('flex items-center justify-center rounded-full bg-brand-200 font-bold text-brand-900', size)}>{student.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
);

export const TextLink = ({ to, children }) => <Link to={to} className="text-sm font-semibold text-brand-700 hover:underline">{children}</Link>;
