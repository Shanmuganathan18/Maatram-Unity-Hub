/**
 * src/pages/CommunicationHub.jsx
 *
 * Consolidated Notifications & Communication Hub for Administrators:
 * 1. Email Delivery Centre: Credential email delivery logs, status, delivery retries.
 * 2. In-App Notifications: System alerts, operational notices, unread indicators.
 * 3. Announcements: Broadcast messages to students, officers, or specific zones.
 */
import { useSearchParams } from 'react-router-dom';
import { Mail, Bell, Megaphone } from 'lucide-react';
import { PageHeader, Tabs } from '../components/ui';
import EmailDeliveryCentre from '../components/admin/EmailDeliveryCentre';
import Notifications from './Notifications';
import Announcements from './Announcements';
import { usePageTitle } from '../hooks/useStore';

export default function CommunicationHub() {
  usePageTitle('Notifications & Communication');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'emails';

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    { id: 'emails', label: 'Email Centre & Credentials', icon: Mail },
    { id: 'notifications', label: 'In-App Notifications', icon: Bell },
    { id: 'announcements', label: 'Announcements Broadcast', icon: Megaphone },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications & Communication"
        subtitle="Manage communication channels: monitor automated credential delivery emails, review system notifications, and publish announcements."
      />

      <Tabs
        label="Communication Hub Navigation"
        tabs={tabs}
        value={currentTab}
        onChange={setTab}
      />

      {currentTab === 'emails' && <EmailDeliveryCentre />}
      {currentTab === 'notifications' && <Notifications />}
      {currentTab === 'announcements' && <Announcements />}
    </div>
  );
}

