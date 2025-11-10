'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../lib/store';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Controls', href: '/controls' },
  { name: 'Assets', href: '/assets' },
  { name: 'Documents', href: '/documents' },
  { name: 'Tickets', href: '/tickets' },
  { name: 'Risks', href: '/risks' },
  { name: 'Vendors', href: '/vendors' },
  { name: 'GDPR ROPA', href: '/gdpr/ropa' },
  { name: 'GDPR DSR', href: '/gdpr/dsr' },
  { name: 'Reports', href: '/reports' },
  { name: 'Audit Logs', href: '/audit', adminOnly: true },
];

export default function Navigation() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return null;

  return (
    <nav className="bg-gray-50 border-r border-gray-200">
      <div className="px-4 py-6">
        <ul className="space-y-2">
          {navigation.map((item) => {
            // Hide admin-only items for non-admin users
            if (item.adminOnly && user?.role !== 'admin') {
              return null;
            }

            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 border-r-2 border-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}