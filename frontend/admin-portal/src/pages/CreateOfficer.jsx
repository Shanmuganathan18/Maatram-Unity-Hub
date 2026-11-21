import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, PageHeader } from '../components/ui';
import { Back } from '../components/layout/common';
import OfficerForm from '../components/officers/OfficerForm';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/useStore';
import { createOfficer } from '../services/officerService';

export default function CreateOfficer() {
  usePageTitle('Create officer'); const { aid } = useAuth(); const nav = useNavigate();
  return (<><Back to="/officers">Officers</Back><PageHeader title="Create officer" subtitle="Creates a pending account and simulates an invitation." />
    <Card className="max-w-3xl"><OfficerForm submitLabel="Create officer" onCancel={() => nav('/officers')} onSubmit={async (v) => { const o = await createOfficer(aid, v); toast.success(`Officer ${o.name} created as Pending Activation (invitation simulated – no email sent).`); nav(`/officers/${o.id}`); }} /></Card></>);
}
