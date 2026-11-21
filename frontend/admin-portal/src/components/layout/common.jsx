import { Link } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { EmptyState, LinkButton } from '../ui';
export const Back = ({ to, children }) => <Link to={to} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" />{children}</Link>;
export const NotFoundCard = ({ what, to }) => <EmptyState icon={SearchX} title={`${what} not found`} text="It doesn’t exist or you don’t have access." action={<LinkButton to={to} variant="secondary">Back</LinkButton>} />;
export const KV = ({ items, cols = 'sm:grid-cols-2' }) => <dl className={`grid gap-3 text-sm ${cols}`}>{items.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase text-ink-mute">{k}</dt><dd className="font-medium text-navy">{v || '—'}</dd></div>)}</dl>;
