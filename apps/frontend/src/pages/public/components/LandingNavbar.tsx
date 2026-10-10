import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '../../../store/AuthStore';
import { NMSandboxLogo } from './NMSandboxLogo';

export const LandingNavbar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDashboardRedirect = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const role = user.roles?.[0] || 'STUDENT';
    if (role === 'STUDENT') navigate('/student/dashboard');
    else if (role === 'FACULTY') navigate('/faculty/dashboard');
    else navigate('/admin/dashboard');
  };

  const handleStartInterview = () => {
    if (user) {
      const role = user.roles?.[0] || 'STUDENT';
      if (role === 'STUDENT') navigate('/student/interviews');
      else if (role === 'FACULTY') navigate('/faculty/dashboard');
      else navigate('/admin/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 px-6 sm:px-12 py-4 sm:py-5 flex items-center justify-between transition-all duration-200 pointer-events-none ${
          isScrolled ? 'bg-white/70 backdrop-blur-md border-b border-slate-200/50' : ''
        }`}
      >
        {/* Brand */}
        <div className="pointer-events-auto flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <NMSandboxLogo size={34} />
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-950 group-hover:opacity-80 transition-opacity">
                NM Sandbox
              </span>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                Naan Mudhalvan
              </span>
            </div>
          </Link>
        </div>

        {/* Center Floating Pill Nav (Stitch exact layout) */}
        <nav className="pointer-events-auto hidden md:flex items-center gap-8 px-6 py-2.5 rounded-full bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-xs font-semibold tracking-wide text-slate-600">
          <a className="hover:text-slate-950 transition-colors" href="#how-it-works">
            How It Works
          </a>
          <a className="hover:text-slate-950 transition-colors" href="#aptitude">
            Assessment
          </a>
          <a className="hover:text-slate-950 transition-colors" href="#practice">
            Practice
          </a>
          <a className="hover:text-slate-950 transition-colors" href="#reports">
            Reports
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-3 sm:gap-4">
          {user ? (
            <button
              onClick={handleDashboardRedirect}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 transition-all hover:scale-[1.02] shadow-sm flex items-center gap-1.5"
            >
              <span>DASHBOARD</span>
              <span className="text-[11px]">→</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:inline-block text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={handleStartInterview}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 transition-all hover:scale-[1.02] shadow-sm flex items-center gap-1.5"
              >
                <span>START INTERVIEW</span>
                <span className="text-[11px]">→</span>
              </button>
            </>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl md:hidden pt-24 px-6 pb-8 flex flex-col justify-between">
          <nav className="flex flex-col gap-5 text-base font-semibold text-slate-800">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-blue-600 transition-colors py-2 border-b border-slate-100"
            >
              How It Works
            </a>
            <a
              href="#aptitude"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-blue-600 transition-colors py-2 border-b border-slate-100"
            >
              Assessment
            </a>
            <a
              href="#practice"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-blue-600 transition-colors py-2 border-b border-slate-100"
            >
              Practice
            </a>
            <a
              href="#reports"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-blue-600 transition-colors py-2 border-b border-slate-100"
            >
              Reports
            </a>
          </nav>

          <div className="flex flex-col gap-3 pt-6 border-t border-slate-200">
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleDashboardRedirect();
                }}
                className="w-full py-3 rounded-full text-center text-xs font-bold text-white bg-slate-950"
              >
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full py-3 rounded-full text-center text-xs font-bold text-slate-900 border border-slate-300"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleStartInterview();
                  }}
                  className="w-full py-3 rounded-full text-center text-xs font-bold text-white bg-slate-950"
                >
                  START INTERVIEW →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LandingNavbar;
