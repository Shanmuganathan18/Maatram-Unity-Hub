import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import StudentLayout from '../layouts/StudentLayout';
import Login from '../pages/Login';
import AuthCallback from '../pages/AuthCallback';
import CompleteProfile from '../pages/CompleteProfile';
import ChangePassword from '../pages/ChangePassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';
import Availability from '../pages/Availability';
import Calendar from '../pages/Calendar';
import Events from '../pages/Events';
import EventDetails from '../pages/EventDetails';
import Responses from '../pages/Responses';
import Notifications from '../pages/Notifications';
import AvailabilityHistory from '../pages/AvailabilityHistory';
import NotificationPreferences from '../pages/NotificationPreferences';
import Profile from '../pages/Profile';
import Help from '../pages/Help';
import NotFound from '../pages/NotFound';

function Protected({ children }) {
  const { sid, student } = useAuth();
  const loc = useLocation();

  if (!sid) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }

  // If password change is forced, lock navigation to /change-password
  if (student?.mustChangePassword && loc.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

export default function AppRoutes() {
  const { sid, student } = useAuth();
  const isMustChange = Boolean(student?.mustChangePassword);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={sid ? (isMustChange ? '/change-password' : '/dashboard') : '/login'} replace />} />
      <Route path="/login" element={sid ? <Navigate to={isMustChange ? '/change-password' : '/dashboard'} replace /> : <Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={sid ? <ChangePassword /> : <Navigate to="/login" replace />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route element={<Protected><StudentLayout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:eventId" element={<EventDetails />} />
        <Route path="/responses" element={<Responses />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/availability-history" element={<AvailabilityHistory />} />
        <Route path="/settings/notifications" element={<NotificationPreferences />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/help" element={<Help />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
