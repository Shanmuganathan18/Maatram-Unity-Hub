import { Compass } from 'lucide-react';
import { LinkButton } from '../components/ui';
import { usePageTitle } from '../hooks/useStore';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-lavender-100 p-6 text-center">
      <Compass className="h-12 w-12 text-brand-700" aria-hidden />
      <h1 className="text-3xl font-extrabold text-navy">Page not found</h1>
      <p className="max-w-sm text-ink-soft">We couldn’t find that page. It may have moved, or the link may be incorrect.</p>
      <LinkButton to="/dashboard">Back to dashboard</LinkButton>
    </div>
  );
}
