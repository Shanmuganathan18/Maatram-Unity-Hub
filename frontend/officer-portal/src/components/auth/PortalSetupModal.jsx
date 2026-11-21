import { CheckCircle2, ShieldCheck, KeyRound, MonitorCheck } from 'lucide-react';
import { Modal, Button } from '../ui';

export default function PortalSetupModal({ open, onOpenChange, portalName = 'Officer Portal' }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={`${portalName} Setup & Readiness Guide`}
      description="System checklist and authentication protocols for authorized personnel."
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Understood
        </Button>
      }
    >
      <div className="space-y-4 text-xs leading-relaxed text-slate-600">
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
          <p className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            Verified Pre-Provisioned Access Only
          </p>
          <p className="mt-1 text-teal-800 text-[11px]">
            Accounts are provisioned by Maatram Foundation administrators. No public self-registration is permitted.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-slate-800 text-xs">Getting Started Checklist</h4>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
              <span>Use your registered official officer email address.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
              <span>Regional zone access is strictly scoped to your assigned administrative territory.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
              <span>Institutional Google Workspace accounts matching your registered email can also be used for Single Sign-On.</span>
            </li>
          </ul>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <MonitorCheck className="w-4 h-4 text-slate-600" />
            Technical Requirements
          </div>
          <p className="text-[11px] text-slate-500">
            Compatible with modern evergreen browsers (Chrome, Edge, Firefox, Safari). TLS 1.3 encryption is active.
          </p>
        </div>
      </div>
    </Modal>
  );
}

