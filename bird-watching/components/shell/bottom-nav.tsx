'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Whether a pathname belongs to this section (so /guide/amerob still highlights "Guide"). */
  matches: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Today', icon: 'calendar', matches: (p) => p === '/' },
  {
    href: '/guide',
    label: 'Guide',
    icon: 'search',
    matches: (p) => p.startsWith('/guide') && !p.startsWith('/guide/glossary'),
  },
  { href: '/guide/glossary', label: 'Glossary', icon: 'info', matches: (p) => p.startsWith('/guide/glossary') },
];

/** Phone-first primary navigation, fixed to the bottom of the viewport. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant/60 bg-surface-container-low/95 backdrop-blur-sm"
    >
      <ul className="mx-auto flex h-[var(--nav-height)] max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const active = item.matches(pathname);
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg type-label-md ${
                  active ? 'text-secondary-fixed' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span
                  className={`flex h-7 w-14 items-center justify-center rounded-full ${active ? 'bg-secondary-container' : ''}`}
                >
                  <Icon name={item.icon} size={20} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
