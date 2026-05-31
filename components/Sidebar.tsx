'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Video, Upload, Calendar, X } from 'lucide-react';

const navItems = [
  { label: 'Home', href: '/', icon: House },
  { label: 'Upcoming', href: '/upcoming', icon: Calendar },
  { label: 'Meetings', href: '/meetings', icon: Video },
  { label: 'Uploads', href: '/uploads', icon: Upload },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  const content = (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-purple-600 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">R</span>
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">Rohoflies.ai</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full
                ${active
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden md:flex h-full">
        {content}
      </div>

      {/* Mobile: drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex h-full">
            {content}
          </div>
          {/* Backdrop */}
          <div className="flex-1 bg-black/30" onClick={onClose} />
        </div>
      )}
    </>
  );
}
