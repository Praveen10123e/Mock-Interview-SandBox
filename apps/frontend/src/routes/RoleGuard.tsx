import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore';
import type { FC } from 'react';

interface RoleGuardProps {
  allowedRoles: string[];
}

export const RoleGuard: FC<RoleGuardProps> = ({ allowedRoles }) => {
  const user = useAuthStore((state) => state.user);

  if (!user || !user.roles.some((role) => allowedRoles.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
