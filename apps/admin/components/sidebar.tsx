'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bus,
  Users,
  GraduationCap,
  Route,
  AlertTriangle,
  Settings,
  LogOut,
  MapPin,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Fleet', href: '/fleet', icon: MapPin },
  { name: 'Buses', href: '/buses', icon: Bus },
  { name: 'Drivers', href: '/drivers', icon: Users },
  { name: 'Students', href: '/students', icon: GraduationCap },
  { name: 'Routes', href: '/routes', icon: Route },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();

  return (
    <div className="flex flex-col h-full bg-white border-r w-64">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-blue-600">SafeRoute</h1>
        <p className="text-xs text-gray-500 mt-1">Bus Tracking System</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="px-4 py-3 mb-2">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
