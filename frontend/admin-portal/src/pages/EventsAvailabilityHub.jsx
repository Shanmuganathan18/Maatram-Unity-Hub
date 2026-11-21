/**
 * src/pages/EventsAvailabilityHub.jsx
 *
 * Consolidated Events & Availability Hub for Administrators:
 * Combines scheduling, availability monitoring, and attendance operations:
 * 1. Availability: Weekly student availability submissions, deadlines, trends, and recommendations.
 * 2. Events: Operational events across zones, categories, invites, and RSVPs.
 * 3. Attendance: Confirmed vs present vs absent participation, officer records, and audited overrides.
 */
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, Ticket, ClipboardCheck } from 'lucide-react';
import { PageHeader, Tabs } from '../components/ui';
import Availability from './Availability';
import Events from './Events';
import Attendance from './Attendance';
import { usePageTitle } from '../hooks/useStore';

export default function EventsAvailabilityHub() {
  usePageTitle('Events & Availability');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'availability';

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    { id: 'availability', label: 'Availability Monitoring', icon: CalendarCheck },
    { id: 'events', label: 'Events & Drives', icon: Ticket },
    { id: 'attendance', label: 'Attendance Records', icon: ClipboardCheck },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Events & Availability"
        subtitle="Monitor weekly student availability submissions, track regional training events, and review verified attendance."
      />

      <Tabs
        label="Events and Availability Navigation"
        tabs={tabs}
        value={currentTab}
        onChange={setTab}
      />

      {currentTab === 'availability' && <Availability />}
      {currentTab === 'events' && <Events />}
      {currentTab === 'attendance' && <Attendance />}
    </div>
  );
}

