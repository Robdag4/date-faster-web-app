'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Calendar, Compass, User, PartyPopper, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  {
    href: '/discover',
    icon: Compass,
    label: 'Discover',
  },
  {
    href: '/dates',
    icon: Package,
    label: 'Dates',
  },
  {
    href: '/matches',
    icon: Heart,
    label: 'Matches',
  },
  {
    href: '/events',
    icon: PartyPopper,
    label: 'Events',
  },
  {
    href: '/profile',
    icon: User,
    label: 'Profile',
  },
];

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-t border-slate-200 safe-area-bottom">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center py-2 px-1 relative"
              >
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      isActive 
                        ? 'text-rose-500' 
                        : 'text-slate-400'
                    }`}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                  
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-rose-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                
                <span
                  className={`text-xs mt-1 font-medium transition-colors ${
                    isActive 
                      ? 'text-rose-500' 
                      : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};