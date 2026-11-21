import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
  secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100 border border-brand-200',
  outline: 'bg-white text-navy border border-lavender-300 hover:bg-lavender-50',
  ghost: 'text-navy hover:bg-lavender-100',
  danger: 'bg-rose-700 text-white hover:bg-rose-800',
  navy: 'bg-navy text-white hover:bg-navy-700',
};
const sizes = { sm: 'min-h-[36px] px-3 text-sm', md: 'min-h-[44px] px-4 text-sm', lg: 'min-h-[52px] px-5 text-base' };
export const buttonClasses = (variant = 'primary', size = 'md', extra) =>
  cn('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50', variants[variant], sizes[size], extra);

export function Button({ variant, size, className, loading, children, disabled, type = 'button', ...p }) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...p}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
export const LinkButton = ({ to, variant, size, className, children, ...p }) => <Link to={to} className={buttonClasses(variant, size, className)} {...p}>{children}</Link>;
