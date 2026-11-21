import { Modal } from '../ui';
import { Heart, Award, Users, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';
import logo from '../../assets/logo.svg';

export default function AboutMaatramModal({ open, onOpenChange }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="About Maatram Foundation"
      description="Transforming lives through higher education since 2013."
      size="lg"
    >
      <div className="space-y-6 text-slate-700 text-sm leading-relaxed pr-1 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
          <img src={logo} alt="Maatram Foundation" className="h-14 w-14 shrink-0" />
          <div>
            <h4 className="font-extrabold text-base text-indigo-950">Maatram Educational Trust</h4>
            <p className="text-xs text-indigo-800">
              Chennai, Tamil Nadu, India &bull; Recognized Non-Profit Organization
            </p>
          </div>
        </div>

        <div>
          <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            Our Mission & Purpose
          </h5>
          <p>
            Maatram Foundation provides free, merit-based higher education to economically underprivileged students from rural, tribal, and disadvantaged backgrounds. Partnering with top engineering and arts & science colleges across South India, Maatram covers complete tuition, hostel, and development expenses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <Award className="h-5 w-5 text-indigo-600 mx-auto mb-1.5" />
            <span className="block font-extrabold text-lg text-slate-900">3,000+</span>
            <span className="text-xs text-slate-500">Graduates Empowered</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <Users className="h-5 w-5 text-indigo-600 mx-auto mb-1.5" />
            <span className="block font-extrabold text-lg text-slate-900">50+</span>
            <span className="text-xs text-slate-500">Partner Colleges</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <BookOpen className="h-5 w-5 text-indigo-600 mx-auto mb-1.5" />
            <span className="block font-extrabold text-lg text-slate-900">100%</span>
            <span className="text-xs text-slate-500">Placement Assistance</span>
          </div>
        </div>

        <div>
          <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Governance, Stewardship & Security
          </h5>
          <p className="text-xs text-slate-600 leading-relaxed">
            The Maatram Availability Planner enforces strict data protection, administrative account provisioning, and role-based access. Student availability is handled respectfully to schedule training bootcamps, mock drives, and corporate placement sessions without impeding academic pursuits.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Official website: <a href="https://maatramfoundation.org" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-0.5">maatramfoundation.org <ExternalLink className="h-3 w-3" /></a></span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

