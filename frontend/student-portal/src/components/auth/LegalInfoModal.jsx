import { useState } from 'react';
import { Shield, FileText, Lock, LifeBuoy } from 'lucide-react';
import { Modal, Button } from '../ui';

export default function LegalInfoModal({ open, onOpenChange, initialTab = 'privacy' }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Foundation Governance & Legal Protocols"
      description="Maatram Educational & Charitable Trust — ISO 9001:2015 Institutional Compliance"
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      <div className="space-y-4 text-sm text-slate-700">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setTab('privacy')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              tab === 'privacy' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-teal-700" />
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => setTab('terms')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              tab === 'terms' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-teal-700" />
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => setTab('security')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              tab === 'security' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-teal-700" />
            Security Assurance
          </button>
          <button
            type="button"
            onClick={() => setTab('support')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              tab === 'support' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5 text-teal-700" />
            Institutional Support
          </button>
        </div>

        {/* Tab Content */}
        {tab === 'privacy' && (
          <div className="space-y-3 pt-2 text-xs leading-relaxed text-slate-600">
            <h4 className="font-bold text-slate-900 text-sm">Data Privacy & Student Confidentiality</h4>
            <p>
              Maatram Foundation is committed to safeguarding scholar and institutional officer privacy under our Foundation Data Governance Charter. Scholar personal data, academic records, and availability disclosures are encrypted in-transit (TLS 1.3) and at-rest using AES-256.
            </p>
            <p>
              Availability responses and contact details are accessible solely to assigned regional zonal officers and authorized foundation leadership. Information is never commercialized, disclosed to third parties, or used outside foundation educational programmes.
            </p>
          </div>
        )}

        {tab === 'terms' && (
          <div className="space-y-3 pt-2 text-xs leading-relaxed text-slate-600">
            <h4 className="font-bold text-slate-900 text-sm">Terms of Operational Service</h4>
            <p>
              By accessing the Maatram Student Availability Planner, users agree to provide truthful weekly availability rosters, maintain login credential confidentiality, and immediately report compromised access keys to foundation administration.
            </p>
            <p>
              Account provisioning is strictly managed by administrators. Unauthorized account sharing or cross-institutional tampering is prohibited and subject to immediate administrative revocation.
            </p>
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-3 pt-2 text-xs leading-relaxed text-slate-600">
            <h4 className="font-bold text-slate-900 text-sm">Security Assurance & Zero-Trust Architecture</h4>
            <div className="grid gap-2 sm:grid-cols-2 mt-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="font-bold text-slate-800">256-Bit SSL / TLS 1.3</p>
                <p className="text-[11px] text-slate-500 mt-1">Full end-to-end transport security with strict cipher suite enforcement.</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="font-bold text-slate-800">Zero-Trust Network Perimeter</p>
                <p className="text-[11px] text-slate-500 mt-1">Multi-factor validation, workstation fingerprinting, and session anomaly detection.</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'support' && (
          <div className="space-y-3 pt-2 text-xs leading-relaxed text-slate-600">
            <h4 className="font-bold text-slate-900 text-sm">Institutional Help & Assistance</h4>
            <p>
              For scholar roster onboarding, temporary password resets, or regional officer transfers, please contact the Maatram Operations Helpdesk:
            </p>
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs space-y-1">
              <p><strong>Email:</strong> support@maatramfoundation.org</p>
              <p><strong>Operations Desk:</strong> +91 44 2827 0000 (Mon–Fri, 9:00 AM – 6:00 PM IST)</p>
              <p><strong>Headquarters:</strong> Maatram Educational & Charitable Trust, Chennai, Tamil Nadu, India</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

