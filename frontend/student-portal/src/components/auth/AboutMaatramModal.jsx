import { Heart, Compass, Users, Sparkles, Building2, CheckCircle2 } from 'lucide-react';
import { Modal, Button } from '../ui';

export default function AboutMaatramModal({ open, onOpenChange }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="About Maatram Foundation"
      description="Bridging education, opportunities, and student empowerment."
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Got it, Close
        </Button>
      }
    >
      <div className="space-y-6 text-sm text-slate-700">
        {/* Mission & Vision */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center gap-2 font-bold text-emerald-900 mb-1">
              <Compass className="h-5 w-5 text-emerald-700" />
              Our Mission
            </div>
            <p className="text-xs leading-relaxed text-emerald-800">
              To identify deserving, meritorious students from economically disadvantaged and rural backgrounds and enable free higher education across top educational institutions.
            </p>
          </div>
          <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4">
            <div className="flex items-center gap-2 font-bold text-indigo-900 mb-1">
              <Sparkles className="h-5 w-5 text-indigo-700" />
              Our Vision
            </div>
            <p className="text-xs leading-relaxed text-indigo-800">
              A transformative society where financial hurdles never block a brilliant mind from receiving college education, holistic career guidance, and impactful life opportunities.
            </p>
          </div>
        </div>

        {/* Purpose of the Planner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-brand-700" />
            Purpose of the Student Availability Planner
          </h4>
          <p className="text-xs leading-relaxed text-slate-600 mb-3">
            The Maatram Student Availability Planner connects students across diverse academic institutions and geographic zones directly with Maatram Foundation officers.
          </p>
          <ul className="space-y-2 text-xs">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Weekly Coordination:</strong> Students indicate which days and time slots they are free each week without academic conflict.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Tailored Invitations:</strong> Officers schedule bootcamps, industry visits, and mock interview drives matching student free time.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Two-Way Respect:</strong> Availability submission and event response are two separate decisions, keeping students empowered at every step.</span>
            </li>
          </ul>
        </div>

        {/* Coordination Architecture */}
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-indigo-700" />
            Connected Triad
          </h4>
          <p className="text-xs leading-relaxed text-slate-600">
            <strong>Students</strong> submit weekly availability and attend tailored training &bull; <strong>Zone Officers</strong> curate events, track attendance, and provide local guidance &bull; <strong>Administrators</strong> oversee institutional partnerships, ensure data integrity, and support operations system-wide.
          </p>
        </div>
      </div>
    </Modal>
  );
}

