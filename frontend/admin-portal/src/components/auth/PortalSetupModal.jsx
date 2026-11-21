import { CheckCircle2, ShieldCheck, KeyRound, MonitorCheck } from 'lucide-react';
import { Modal, Button } from '../ui';

export default function PortalSetupModal({ open, onOpenChange, portalName = 'Administrator Portal' }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={`${portalName} Setup & Executive Charter`}
      description="System checklist and governance protocols for authorized executive personnel."
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Understood
        </Button>
      }
    >
      <div className="space-y-4 text-xs leading-relaxed text-slate-600">
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl">
          <p className="font-bold text-sky-900 flex items-center gap-1.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-sky-700" />
            Executive Administrative Access (Tier-1)
          </p>
          <p className="mt-1 text-sky-800 text-[11px]">
            System administrator access is strictly restricted to Foundation Executive Council members. All access attempts are geolocated and recorded under Foundation Security Mandate.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-slate-800 text-xs">Administrative Governance Checklist</h4>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
              <span>Full governance over students, regional officers, partner colleges, and system-wide audit records.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
              <span>Single Admin role architecture (no super-admin tier; all administrators possess identical governance rights).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
              <span>Authorized Foundation Google Workspace Single Sign-On enabled for registered executive emails.</span>
            </li>
          </ul>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <MonitorCheck className="w-4 h-4 text-slate-600" />
            Zero-Trust Network Perimeter
          </div>
          <p className="text-[11px] text-slate-500">
            Workstation fingerprinting (TLS 1.3), tamper-evident audit logging, and automated session termination on unauthorized access.
          </p>
        </div>
      </div>
    </Modal>
  );
}

