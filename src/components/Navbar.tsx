'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/stories', label: 'Stories' },
  { href: '/about', label: 'About' },
];

const Navbar = () => {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="bg-background border-b border-muted">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-2xl font-heading tracking-wide py-3">
            Classical Virtues
          </Link>
          <div className="flex items-center gap-1">
            {links.map(({ href, label }) => {
              const isCurrent = pathname === href;
              const inSection = isCurrent || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`inline-flex items-center px-3 py-3 hover:underline underline-offset-4 ${
                    inSection ? 'underline font-medium' : ''
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
