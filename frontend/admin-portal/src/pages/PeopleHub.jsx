/**
 * src/pages/PeopleHub.jsx
 *
 * Consolidated People & Access Hub for Administrators:
 * Combines all user and account management features into one unified menu with internal tabs:
 * 1. Students: View all students, search, filter, individual creation, CSV/Excel bulk import, mapping.
 * 2. Officers: View all officers, creation, bulk import, zone assignments, responsibilities.
 * 3. Admins: View and create Administrator accounts (single unified ADMIN role).
 * 4. All Accounts: Cross-portal user overview (students, officers, admins) with live status toggling.
 * 5. Account Activation: Password status, mandatory first-login change, email logs & live retries.
 * 6. Import History: Audit log of bulk CSV/Excel provisioning sessions with record counts and error files.
 */
import { useSearchParams } from 'react-router-dom';
import { Users, UserCog, ShieldCheck, KeyRound, UsersRound, FileSpreadsheet } from 'lucide-react';
import { PageHeader, Tabs } from '../components/ui';
import Students from './Students';
import Officers from './Officers';
import AdminManagement from './AdminManagement';
import UsersPage from './Users';
import EmailDeliveryCentre from '../components/admin/EmailDeliveryCentre';
import ImportHistory from '../components/admin/ImportHistory';
import { usePageTitle } from '../hooks/useStore';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export default function PeopleHub() {
  usePageTitle('People & Access');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'students';

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    { id: 'students', label: 'Students', icon: Users },
    { id: 'officers', label: 'Officers', icon: UserCog },
    { id: 'admins', label: 'Administrators', icon: ShieldCheck },
    { id: 'users', label: 'All Accounts', icon: UsersRound },
    { id: 'activation', label: 'Account Activation', icon: KeyRound },
    { id: 'imports', label: 'Import History', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="People & Access"
        subtitle="Unified user management across all regional zones: provision students & officers, audit bulk imports, manage administrators, and monitor credential activations."
      />

      {/* Internal Navigation Tabs */}
      <Tabs
        label="People and Access Navigation"
        tabs={tabs}
        value={currentTab}
        onChange={setTab}
      />

      {/* Tab Panels */}
      <ErrorBoundary key={currentTab}>
        {currentTab === 'students' && <Students />}
        {currentTab === 'officers' && <Officers />}
        {currentTab === 'admins' && <AdminManagement />}
        {currentTab === 'users' && <UsersPage />}
        {currentTab === 'activation' && <EmailDeliveryCentre />}
        {currentTab === 'imports' && <ImportHistory />}
      </ErrorBoundary>
    </div>
  );
}
