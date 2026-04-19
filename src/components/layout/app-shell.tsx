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
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
};