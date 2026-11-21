import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (<BrowserRouter><AuthProvider><PermissionProvider><AppRoutes /><Toaster position="top-center" richColors closeButton /></PermissionProvider></AuthProvider></BrowserRouter>);
}
