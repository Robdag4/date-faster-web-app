'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { Heart, Settings, Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const pathname = usePathname();

  // Get page title based on current route
  const getPageTitle = () => {
    if (pathname.startsWith('/discover')) return 'Discover';
    if (pathname.startsWith('/matches')) return 'Matches';
    if (pathname.startsWith('/events')) return 'Events';
    if (pathname.startsWith('/profile')) return 'Profile';
    if (pathname.startsWith('/settings')) return 'Settings';
    return 'Date Faster';
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {getPageTitle()}
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Premium */}
            {!user?.is_premium && (
              <Link href="/premium" className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm hover:shadow-md transition-shadow">
                ⭐ Premium
              </Link>
            )}
            {user?.is_premium && (
              <Link href="/premium" className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                ⭐ PRO
              </Link>
            )}

            {/* Settings */}
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </Link>

            {/* Profile Picture */}
            {user?.photos?.[0] && (
              <Link
                href="/profile"
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-200"
              >
                <img
                  src={user.photos[0]}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};