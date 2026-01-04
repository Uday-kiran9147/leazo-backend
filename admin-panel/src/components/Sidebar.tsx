'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  MapPin, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  ChevronRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: MapPin, label: 'Listings', href: '/routes' },
  { icon: Users, label: 'Users', href: '/users' },
  { icon: TrendingUp, label: 'Analytics', href: '/analytics' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 transition-all duration-300 border-r border-white/5 bg-black z-50 flex flex-col",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-8 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00ff00] flex items-center justify-center">
              <ShieldCheck className="text-black w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">LEAZO</span>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-white/5 rounded-lg text-white/40 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                isActive 
                  ? "bg-white/5 text-[#00ff00]" 
                  : "text-white/40 hover:text-white"
              )}>
                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-[#00ff00]" : "group-hover:text-white")} />
                {!isCollapsed && (
                  <span className="font-medium text-[11px] uppercase tracking-[0.1em]">{item.label}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-6">
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-white/20 hover:text-red-500 hover:bg-red-500/5 transition-all text-[11px] font-bold uppercase tracking-widest"
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
