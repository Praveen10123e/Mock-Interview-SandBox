import { useState, type FC } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { motion } from 'framer-motion';

export const PortalLayout: FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const isInterviewSession = location.pathname.includes('/interviews/session');

  if (isInterviewSession) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-bg font-sans">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg font-sans">
      <Sidebar 
        isOpen={mobileSidebarOpen} 
        onClose={() => setMobileSidebarOpen(false)} 
      />
      
      <div className="flex flex-1 flex-col overflow-hidden relative min-w-0">
        <Header onMenuToggle={() => setMobileSidebarOpen(prev => !prev)} />
        
        <main className={`flex-1 ${isInterviewSession ? 'overflow-hidden p-0' : 'overflow-y-auto bg-slate-50 px-6 py-6 sm:px-8 sm:py-8 lg:px-9 lg:py-8'} relative selection:bg-blue-100`}>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="h-full w-full relative z-10 flex flex-col"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
