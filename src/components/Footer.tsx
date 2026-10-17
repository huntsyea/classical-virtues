import Link from 'next/link'
import Wordmark from '@/components/Wordmark'
import Seal from '@/components/Seal'
import { roman } from '@/components/roman'
import { copyrightYear } from '@/lib/copyright'

export interface FooterVirtue {
  slug: string
  title: string
}

const readLinks = [
  { href: '/', label: 'Home' },
  { href: '/stories', label: 'All stories' },
  { href: '/virtues', label: 'The virtues' },
  { href: '/about', label: 'About the collection' },
]

export default async function Footer({ virtues = [] }: { virtues?: FooterVirtue[] }) {
  const year = await copyrightYear()

  return (
    <footer className="mt-24 bg-surface sm:mt-32">
      <div className="page-wrap">
        <div className="border-t-2 border-rule-strong pb-10 pt-10 sm:pb-14 sm:pt-14">
          <div className="grid gap-10 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-5">
              <Link href="/" className="inline-flex min-h-11 items-center gap-3">
                <Seal size={40} />
                <Wordmark className="text-[2rem] leading-none" />
              </Link>
              <p className="dek mt-3 max-w-[22ch] text-[1.125rem]">
                Gathered and retold for families who read together.
              </p>
            </div>

            <nav aria-labelledby="footer-read" className="md:col-span-3">
              <h2 id="footer-read" data-after-story="" tabIndex={-1} className="landing-focus kicker text-foreground">
                Read
              </h2>
              <ul className="mt-2">
                {readLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex min-h-11 items-center text-[0.9375rem] transition-colors hover:text-primary lg:min-h-9"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {virtues.length > 0 && (
              <nav aria-labelledby="footer-virtues" className="md:col-span-4">
                <h2 id="footer-virtues" className="kicker text-foreground">
                  The seven virtues
                </h2>
                <ul className="mt-2 grid grid-flow-col grid-cols-2 grid-rows-4 gap-x-6">
                  {virtues.map((virtue, i) => (
                    <li key={virtue.slug}>
                      <Link
                        href={`/virtues/${virtue.slug}`}
                        className="inline-flex min-h-11 items-center gap-2.5 text-[0.9375rem] transition-colors hover:text-primary lg:min-h-9"
                      >
                        <span aria-hidden="true" className="w-5 font-heading text-[0.8125rem] text-muted-foreground">
                          {roman(i + 1)}
                        </span>
                        {virtue.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          <div className="meta mt-12 flex flex-col gap-2 border-t border-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {year} Classical Virtues</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
