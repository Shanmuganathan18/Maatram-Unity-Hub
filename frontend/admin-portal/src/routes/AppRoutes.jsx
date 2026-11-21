import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../layouts/AdminLayout';
import { RequirePermission } from '../components/layout/Gate';
import Login from '../pages/Login';
import AuthCallback from '../pages/AuthCallback';
import ChangePassword from '../pages/ChangePassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';

// Consolidated Hubs
import PeopleHub from '../pages/PeopleHub';
import InstitutionsHub from '../pages/InstitutionsHub';
import EventsAvailabilityHub from '../pages/EventsAvailabilityHub';
import CommunicationHub from '../pages/CommunicationHub';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import ActivityLogs from '../pages/ActivityLogs';
import Support from '../pages/Support';
import Profile from '../pages/Profile';
import NotFound from '../pages/NotFound';

// Detail & Action Views
import CreateZone from '../pages/CreateZone';
import ZoneDetails from '../pages/ZoneDetails';
import CreateOfficer from '../pages/CreateOfficer';
import OfficerDetails from '../pages/OfficerDetails';
import InstitutionDetails from '../pages/InstitutionDetails';
import StudentDetails from '../pages/StudentDetails';
import EventDetails from '../pages/EventDetails';

function Protected({ children }) {
  const { aid, admin } = useAuth();
  const loc = useLocation();

  if (!aid) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }

  if (admin?.mustChangePassword && loc.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

const G = (perm, el) => <RequirePermission perm={perm}>{el}</RequirePermission>;

export default function AppRoutes() {
  const { aid, admin } = useAuth();
  const isMustChange = Boolean(admin?.mustChangePassword);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={aid ? (isMustChange ? '/change-password' : '/dashboard') : '/login'}
            replace
          />
        }
      />
      <Route
        path="/login"
        element={
          aid ? <Navigate to={isMustChange ? '/change-password' : '/dashboard'} replace /> : <Login />
        }
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/change-password"
        element={aid ? <ChangePassword /> : <Navigate to="/login" replace />}
      />

      {/* Authenticated Admin Shell */}
      <Route
        element={
          <Protected>
            <AdminLayout />
          </Protected>
        }
      >
        {/* 1. Dashboard */}
        <Route path="/dashboard" element={G('reports.view', <Dashboard />)} />

        {/* 2. People & Access Hub */}
        <Route path="/people" element={G('users.view', <PeopleHub />)} />
        <Route path="/students/:studentId" element={G('students.view', <StudentDetails />)} />
        <Route path="/officers/create" element={G('officers.create', <CreateOfficer />)} />
        <Route path="/officers/:officerId" element={G('officers.view', <OfficerDetails />)} />

        {/* 3. Institutions & Zones Hub */}
        <Route path="/institutions-zones" element={G('institutions.view', <InstitutionsHub />)} />
        <Route path="/zones/create" element={G('zones.create', <CreateZone />)} />
        <Route path="/zones/:zoneId" element={G('zones.view', <ZoneDetails />)} />
        <Route path="/institutions/:institutionId" element={G('institutions.view', <InstitutionDetails />)} />

        {/* 4. Events & Availability Hub */}
        <Route path="/events-availability" element={G('availability.view', <EventsAvailabilityHub />)} />
        <Route path="/events/:eventId" element={G('events.view', <EventDetails />)} />

        {/* 5. Notifications & Communication Hub */}
        <Route path="/communication" element={G('announcements.view', <CommunicationHub />)} />

        {/* 6. Reports & Analytics (with embedded Export Centre) */}
        <Route path="/reports" element={G('reports.view', <Reports />)} />

        {/* 7. System Settings (General, Security, Roles/Permissions, Configuration) */}
        <Route path="/settings" element={G('settings.view', <Settings />)} />

        {/* 8. Activity & Audit Logs */}
        <Route path="/activity-logs" element={G('audit.view', <ActivityLogs />)} />

        {/* 9. Help & Support */}
        <Route path="/support" element={G('support.view', <Support />)} />

        {/* User Profile */}
        <Route path="/profile" element={<Profile />} />

        {/* Backwards-compatible redirects for legacy flat routes */}
        <Route path="/students" element={<Navigate to="/people?tab=students" replace />} />
        <Route path="/officers" element={<Navigate to="/people?tab=officers" replace />} />
        <Route path="/admins" element={<Navigate to="/people?tab=admins" replace />} />
        <Route path="/users" element={<Navigate to="/people" replace />} />
        <Route path="/zones" element={<Navigate to="/institutions-zones?tab=zones" replace />} />
        <Route path="/institutions" element={<Navigate to="/institutions-zones?tab=institutions" replace />} />
        <Route path="/availability" element={<Navigate to="/events-availability?tab=availability" replace />} />
        <Route path="/events" element={<Navigate to="/events-availability?tab=events" replace />} />
        <Route path="/attendance" element={<Navigate to="/events-availability?tab=attendance" replace />} />
        <Route path="/notifications" element={<Navigate to="/communication?tab=notifications" replace />} />
        <Route path="/announcements" element={<Navigate to="/communication?tab=announcements" replace />} />
        <Route path="/data-centre" element={<Navigate to="/reports?tab=export" replace />} />
        <Route path="/roles" element={<Navigate to="/settings?tab=permissions" replace />} />
        <Route path="/permissions" element={<Navigate to="/settings?tab=permissions" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
