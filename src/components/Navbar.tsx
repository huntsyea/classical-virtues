import Link from 'next/link';

const Navbar = () => {
  return (
    <nav className="bg-background border-b border-muted">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-2xl font-heading font-semibold tracking-wide">
            Classical Virtues
          </Link>
          <div className="space-x-6">
            <Link href="/stories" className="hover:underline">
              Stories
            </Link>
            <Link href="/about" className="hover:underline">
              About
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
