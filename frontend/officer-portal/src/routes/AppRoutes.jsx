import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import OfficerLayout from '../layouts/OfficerLayout';
import Login from '../pages/Login';
import AuthCallback from '../pages/AuthCallback';
import ChangePassword from '../pages/ChangePassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';
import Students from '../pages/Students';
import StudentDetails from '../pages/StudentDetails';
import Institutions from '../pages/Institutions';
import InstitutionDetails from '../pages/InstitutionDetails';
import Availability from '../pages/Availability';
import AvailabilityDetails from '../pages/AvailabilityDetails';
import Calendar from '../pages/Calendar';
import Events from '../pages/Events';
import CreateEvent from '../pages/CreateEvent';
import EventDetails from '../pages/EventDetails';
import EventResponses from '../pages/EventResponses';
import Attendance from '../pages/Attendance';
import Notifications from '../pages/Notifications';
import Reports from '../pages/Reports';
import Activity from '../pages/Activity';
import Profile from '../pages/Profile';
import NotFound from '../pages/NotFound';

function Protected({ children }) {
  const { oid, officer } = useAuth();
  const loc = useLocation();

  if (!oid) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }

  if (officer?.mustChangePassword && loc.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

export default function AppRoutes() {
  const { oid, officer } = useAuth();
  const isMustChange = Boolean(officer?.mustChangePassword);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={oid ? (isMustChange ? '/change-password' : '/dashboard') : '/login'} replace />} />
      <Route path="/login" element={oid ? <Navigate to={isMustChange ? '/change-password' : '/dashboard'} replace /> : <Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={oid ? <ChangePassword /> : <Navigate to="/login" replace />} />
      <Route element={<Protected><OfficerLayout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/:studentId" element={<StudentDetails />} />
        <Route path="/institutions" element={<Institutions />} />
        <Route path="/institutions/:institutionId" element={<InstitutionDetails />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/availability/:weekId" element={<AvailabilityDetails />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/create" element={<CreateEvent />} />
        <Route path="/events/:eventId" element={<EventDetails />} />
        <Route path="/events/:eventId/responses" element={<EventResponses />} />
        <Route path="/events/:eventId/attendance" element={<Attendance />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
