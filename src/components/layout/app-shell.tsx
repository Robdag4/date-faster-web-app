'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { MobileNav } from './mobile-nav';
import { Header } from './header';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  
  // Don't show app shell on auth, onboarding, or admin pages
  const hideShell = pathname === '/' || 
                   pathname.startsWith('/onboarding') || 
                   pathname.startsWith('/admin') ||
                   pathname.startsWith('/auth');

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-cream-50 flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="shrink-0">
        <Header />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <motion.div
          key={pathname}
          className="h-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>
      
      {/* Mobile Navigation - Sticky Bottom */}
      <div className="shrink-0">
        <MobileNav />
      </div>
    </div>
  );
};