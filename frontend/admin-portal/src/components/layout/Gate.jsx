import { ShieldAlert } from 'lucide-react';
import { usePermissions } from '../../context/PermissionContext';
import { EmptyState, LinkButton } from '../ui';

/** Hides children when the permission is missing. */
export const Can = ({ perm, children, fallback = null }) => (usePermissions().can(perm) ? children : fallback);

export const AccessDenied = ({ perm }) => (
  <div className="mx-auto max-w-lg py-10">
    <EmptyState icon={ShieldAlert} title="Access denied" text={`Your account does not have permission to open this page${perm ? ` (${perm})` : ''}. If you need access, ask a Super Admin.`} action={<LinkButton to="/dashboard" variant="secondary">Back to dashboard</LinkButton>} />
  </div>
);
/** Route guard: direct URL navigation to a restricted page shows Access denied. */
export const RequirePermission = ({ perm, children }) => (usePermissions().can(perm) ? children : <AccessDenied perm={perm} />);
