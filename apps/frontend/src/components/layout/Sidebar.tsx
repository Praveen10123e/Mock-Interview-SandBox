import type { FC } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Calendar,
  Code2,
  BookOpen,
  Activity,
  BarChart3,
  Sparkles,
  User,
  Settings,
  LogOut,
  Briefcase,
  X,
  Database,
  Server,
  Shield,
  FileText,
  Users
} from 'lucide-react';
import { useAuthStore } from '../../store/AuthStore';

interface NavItem {
  name: string;
  path: string;
  icon: any;
  disabled?: boolean;
  badge?: string | number;
}

const roleConfigs: Record<string, NavItem[]> = {
  STUDENT: [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Interviews', path: '/student/interviews', icon: Calendar },
    { name: 'Practice', path: '/student/practice', icon: Code2 },
    { name: 'Question Bank', path: '/student/questions', icon: BookOpen },
    { name: 'Progress', path: '/student/progress', icon: Activity },
    { name: 'Reports', path: '/student/reports', icon: BarChart3 },
    { name: 'Recommendations', path: '/student/recommendations', icon: Sparkles },
    { name: 'Profile', path: '/student/profile', icon: User },
  ],
  FACULTY: [
    { name: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
    { name: 'Students', path: '/faculty/students', icon: Users },
    { name: 'Question Bank', path: '/faculty/questions', icon: BookOpen },
    { name: 'Templates', path: '/faculty/templates', icon: FileText },
    { name: 'Interviews', path: '/faculty/interviews', icon: Calendar },
    { name: 'Analytics', path: '/faculty/analytics', icon: Activity },
    { name: 'Reports', path: '/faculty/reports', icon: BarChart3 },
    { name: 'Profile', path: '/faculty/profile', icon: User },
  ],
  ADMINISTRATOR: [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Question Bank', path: '/admin/questions', icon: BookOpen },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { name: 'Datasets', path: '/admin/datasets', icon: Database },
    { name: 'System', path: '/admin/system', icon: Server },
    { name: 'Analytics', path: '/admin/analytics', icon: Activity },
  ],
  ADMIN: [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Question Bank', path: '/admin/questions', icon: BookOpen },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { name: 'Datasets', path: '/admin/datasets', icon: Database },
    { name: 'System', path: '/admin/system', icon: Server },
    { name: 'Analytics', path: '/admin/analytics', icon: Activity },
  ]
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    clearAuth();
    queryClient.clear();
    navigate('/login');
  };

  const primaryRole = user?.roles?.[0] || 'STUDENT';
  const navItems = roleConfigs[primaryRole] || roleConfigs.STUDENT;
  const settingsPath = (primaryRole === 'ADMINISTRATOR' || primaryRole === 'ADMIN') ? '/admin/settings' : primaryRole === 'FACULTY' ? '/faculty/settings' : '/student/settings';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-[195px] shrink-0 flex flex-col bg-white border-r border-border transition-transform duration-200 ease-out
        lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
              <Briefcase className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[14px] tracking-tight text-slate-900 leading-tight">
                NM Sandbox
              </span>
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                {primaryRole}
              </span>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Main Navigation Section */}
        <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-4">
          <div className="space-y-1">
            <div className="px-2.5 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Main Navigation
            </div>

            <nav className="space-y-0.5">
              {navItems.map((item) =>
                item.disabled ? (
                  <div
                    key={item.name}
                    className="group flex cursor-not-allowed items-center justify-between rounded-lg h-[40px] px-2.5 text-[14px] font-medium text-slate-500 opacity-75"
                    title="Coming Soon"
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Soon</span>
                  </div>
                ) : (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center justify-between h-[40px] px-2.5 text-[14px] font-medium transition-colors duration-150 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ring-0 ${isActive
                        ? 'bg-blue-50 text-blue-600 font-[600] border-l-[3px] border-blue-600 rounded-r-lg rounded-l-none'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon
                            className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                              }`}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>

                        {item.badge && (
                          <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              )}
            </nav>
          </div>
        </div>

        {/* Separated Bottom Secondary Actions */}
        <div className="border-t border-border p-2.5 space-y-1 bg-white shrink-0">
          <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-medium text-slate-500">
            <span>Interface</span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Light</span>
          </div>

          <NavLink
            to={settingsPath}
            onClick={onClose}
            className={({ isActive }) =>
              `flex w-full items-center gap-2.5 h-[40px] px-2.5 text-[14px] font-medium transition-colors duration-150 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none ring-0 ${isActive
                ? 'bg-blue-50 text-blue-600 font-[600] border-l-[3px] border-blue-600 rounded-r-lg rounded-l-none'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg'
              }`
            }
          >
            {primaryRole === 'ADMINISTRATOR' ? (
              <Shield className="h-[18px] w-[18px] shrink-0 text-slate-400" />
            ) : (
              <Settings className="h-[18px] w-[18px] shrink-0 text-slate-400" />
            )}
            <span>Settings</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 h-[40px] px-2.5 text-[14px] font-medium text-slate-600 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600 cursor-pointer rounded-lg outline-none focus:outline-none"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 opacity-70" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
