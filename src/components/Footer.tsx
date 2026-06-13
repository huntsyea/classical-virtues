import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="border-t border-muted mt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-heading text-lg">Classical Virtues</p>
        <p className="text-sm text-muted-foreground text-center">
          Timeless stories, told for reading aloud.
        </p>
        <nav aria-label="Footer" className="flex items-center gap-1">
          <Link href="/stories" className="inline-flex items-center px-3 py-3 text-sm hover:underline underline-offset-4">
            Stories
          </Link>
          <Link href="/about" className="inline-flex items-center px-3 py-3 text-sm hover:underline underline-offset-4">
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
