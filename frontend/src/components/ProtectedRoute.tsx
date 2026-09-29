import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-5 w-5 text-slate-500"/></div>;
  return user ? <Outlet/> : <Navigate to="/login" replace/>;
}
