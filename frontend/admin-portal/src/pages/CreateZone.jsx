import { useNavigate } from 'react-router-dom';
import { Card, PageHeader } from '../components/ui';
import { Back } from '../components/layout/common';
import ZoneForm from '../components/zones/ZoneForm';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/useStore';
import { createZone } from '../services/zoneService';
import { toast } from 'sonner';

export default function CreateZone() {
  usePageTitle('Create zone'); const { aid } = useAuth(); const nav = useNavigate();
  return (<><Back to="/zones">Zones</Back><PageHeader title="Create zone" subtitle="Zone codes must be unique. A new zone has no officers or institutions until you assign them." />
    <Card className="max-w-3xl"><ZoneForm submitLabel="Create zone" onCancel={() => nav('/zones')} onSubmit={async (v) => { const z = await createZone(aid, v); toast.success(`Zone ${z.code} created.`); nav(`/zones/${z.id}`); }} /></Card></>);
}
