import { Compass, Users, Sparkles, Building2, CheckCircle2 } from 'lucide-react';
import { Modal, Button } from '../ui';

export default function AboutMaatramModal({ open, onOpenChange }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="About Maatram Foundation"
      description="Zone Leadership & Student Mentorship Coordination"
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      <div className="space-y-6 text-sm text-slate-700">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-teal-50 border border-teal-200 p-4">
            <div className="flex items-center gap-2 font-bold text-teal-900 mb-1">
              <Compass className="h-5 w-5 text-teal-700" />
              Our Mission
            </div>
            <p className="text-xs leading-relaxed text-teal-800">
              To identify deserving, meritorious students from economically challenged backgrounds and facilitate free higher education across top educational institutions.
            </p>
          </div>
          <div className="rounded-xl bg-slate-100 border border-slate-200 p-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
              <Sparkles className="h-5 w-5 text-slate-700" />
              Our Vision
            </div>
            <p className="text-xs leading-relaxed text-slate-800">
              A transformative society where every meritorious student has equal access to higher education, professional skills, and holistic life opportunities.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-teal-700" />
            The Officer's Role in Availability Coordination
          </h4>
          <p className="text-xs leading-relaxed text-slate-600 mb-3">
            Zone Officers are the operational heart of Maatram Foundation:
          </p>
          <ul className="space-y-2 text-xs">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
              <span><strong>Zone Scoping:</strong> Monitor weekly availability submissions from students within your assigned geographic zone.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
              <span><strong>Event Curations:</strong> Design training programs, mentor meetings, and mock interviews matching student availability patterns.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
              <span><strong>Attendance & Tracking:</strong> Mark actual attendance and submit real-time operational feedback to administrators.</span>
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

