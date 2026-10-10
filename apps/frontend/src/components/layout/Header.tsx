import type { FC } from 'react';
import { useAuthStore } from '../../store/AuthStore';
import { ChevronRight, User as UserIcon, LogOut, Settings, Menu, ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const paths = location.pathname.split('/').filter(Boolean);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    queryClient.clear();
    navigate('/login');
  };

  const rawFirst = (profile?.firstName || user?.firstName || '').trim();
  const rawLast = (profile?.lastName || user?.lastName || '').trim();
  const first = (rawFirst === 'New' && rawLast === 'User') ? '' : rawFirst;
  const last = (rawFirst === 'New' && rawLast === 'User') ? '' : rawLast;

  const combinedName = [first, last].filter(Boolean).join(' ');
  const emailPrefixName = user?.email ? user.email.split('@')[0].replace(/[._-]/g, ' ') : '';
  const formattedEmailName = emailPrefixName
    .split(' ')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  const displayName = combinedName || user?.name || formattedEmailName || 'Candidate';
  const roleName = user?.roles?.[0] || 'STUDENT';

  const nameParts = displayName.split(/\s+/).filter(Boolean);
  let initial = 'C';
  if (nameParts.length >= 2) {
    initial = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
  } else if (nameParts.length === 1 && nameParts[0].length >= 2) {
    initial = `${nameParts[0][0]}${nameParts[0][1]}`.toUpperCase();
  } else if (nameParts.length === 1) {
    initial = nameParts[0][0].toUpperCase();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-8 z-30 sticky top-0 shadow-xs">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile Menu Button */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Dynamic Breadcrumbs */}
        <nav className="hidden sm:flex items-center text-[13px] leading-[18px] font-medium text-slate-500" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-2">
            {paths.map((path, index) => {
              const isLast = index === paths.length - 1;
              const href = '/' + paths.slice(0, index + 1).join('/');
              return (
                <li key={path} className="inline-flex items-center gap-2">
                  {index > 0 && <ChevronRight className="h-4 w-4 text-slate-400 opacity-60" />}
                  {isLast ? (
                    <span className="text-slate-900 capitalize font-semibold">{path.replace(/-/g, ' ')}</span>
                  ) : (
                    <Link to={href} className="capitalize hover:text-slate-900 transition-colors text-slate-500">
                      {path.replace(/-/g, ' ')}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Profile Cluster */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-hover border border-border-card transition-colors focus:outline-none cursor-pointer group shadow-xs"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            {/* Circular Avatar */}
            <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
              {initial}
            </div>

            {/* Name + Role Label */}
            <div className="hidden sm:flex flex-col items-start text-left">
              <span className="text-sm font-semibold text-text-primary leading-tight group-hover:text-accent transition-colors truncate max-w-[150px]">
                {displayName}
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-text-muted leading-tight">
                {roleName}
              </span>
            </div>

            <ChevronDown className="h-4 w-4 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-border-card bg-surface-elevated p-1.5 shadow-2xl z-50 origin-top-right"
              >
                <div className="px-3 py-2.5 border-b border-border mb-1">
                  <p className="text-xs font-semibold text-text-primary truncate">{displayName}</p>
                  <p className="text-[11px] text-text-muted truncate font-mono">{user?.email}</p>
                </div>

                <div className="flex flex-col space-y-0.5">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      const base = roleName.toUpperCase() === 'FACULTY' ? '/faculty' : roleName.toUpperCase() === 'ADMIN' ? '/admin' : '/student';
                      navigate(`${base}/profile`);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors text-left cursor-pointer"
                  >
                    <UserIcon className="h-3.5 w-3.5 opacity-80" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      const base = roleName.toUpperCase() === 'FACULTY' ? '/faculty' : roleName.toUpperCase() === 'ADMIN' ? '/admin' : '/student';
                      navigate(`${base}/settings`);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors text-left cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5 opacity-80" />
                    <span>Settings</span>
                  </button>

                  <div className="my-1 h-px bg-border" />

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
