'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useMe, useLogout } from '@/hooks/useAuth';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  children?: { href: string; icon: string; label: string }[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard',  icon: '📊', label: 'Dashboard' },
      { href: '/employees',  icon: '👥', label: 'Employees' },
      {
        href: '/attendance',
        icon: '📅',
        label: 'Attendance',
        children: [
          { href: '/attendance/shifts',   icon: '🕐', label: 'Shifts'   },
          { href: '/attendance/holidays', icon: '🎉', label: 'Holidays' },
          { href: '/attendance/leave',    icon: '🌿', label: 'Leave'    },
        ],
      },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { href: '/payroll',   icon: '💰', label: 'Run Payroll' },
      { href: '/payslips',  icon: '📄', label: 'Payslips'   },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/reports', icon: '📈', label: 'Reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings',    icon: '⚙️', label: 'Settings'   },
      { href: '/kiosk/setup', icon: '📱', label: 'Kiosk Setup' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const logout   = useLogout();
  const { data: user } = useMe();

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? '?';

  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/dashboard' && pathname.startsWith(href + '/'));

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-primary flex flex-col z-50 select-none">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🏢</span>
          <div>
            <h2 className="text-white font-bold text-sm leading-tight">HRMS</h2>
            <p className="text-white/40 text-[11px] leading-tight">HR & Payroll</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-5 pt-4 pb-1 text-[10px] font-bold tracking-[1.2px] uppercase text-white/30">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isActive(item.href);
              // Show children if this item or any child is active
              const showChildren = item.children && (
                active || item.children.some((c) => isActive(c.href))
              );

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-3 px-5 py-2.5 text-[13.5px] transition-all border-l-[3px] no-underline',
                      active
                        ? 'bg-white/15 text-white border-accent font-semibold'
                        : 'text-white/65 border-transparent hover:bg-white/8 hover:text-white',
                    )}
                  >
                    <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>

                  {/* Sub-items — always visible when parent section is active */}
                  {showChildren && item.children?.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx(
                          'flex items-center gap-3 pl-10 pr-5 py-2 text-[12.5px] transition-all border-l-[3px] no-underline',
                          childActive
                            ? 'bg-white/10 text-white border-accent/70 font-semibold'
                            : 'text-white/50 border-transparent hover:bg-white/6 hover:text-white/80',
                        )}
                      >
                        <span className="text-sm w-4 text-center shrink-0">{child.icon}</span>
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">
              {user?.name ?? '—'}
            </p>
            <p className="text-white/40 text-[11px] truncate">{user?.role ?? ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-1.5 rounded-lg text-[12px] text-white/45 hover:bg-white/10 hover:text-white transition-all"
        >
          ↩ Sign out
        </button>
      </div>
    </aside>
  );
}
