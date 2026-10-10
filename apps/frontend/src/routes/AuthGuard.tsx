import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore';
import { Loader2 } from 'lucide-react';
import type { FC } from 'react';

export const AuthGuard: FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRestoring = useAuthStore((state) => state.isRestoring);

  if (isRestoring) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0f] text-white">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Restoring Session...</h2>
        <p className="text-muted-foreground text-sm mt-2">Please wait while we verify your credentials.</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
