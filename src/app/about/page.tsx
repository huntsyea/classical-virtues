import Link from 'next/link';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { aboutJsonLd, brandedOgImage, pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/about',
  title: 'About',
  description: 'Why virtue, and why stories? Classical Virtues gathers short classical tales for character, wisdom, and moral imagination.',
  images: [brandedOgImage('about')],
});

// Prerender this route (see the Basehub caching note in src/lib/basehub.ts).
export const dynamic = 'force-static'

export default function AboutPage() {
  return (
    <article className="page-wrap pt-10 sm:pt-16 lg:pt-20">
      <header className="measure">
        <p className="kicker">About the collection</p>
        <h1 className="headline-1 mt-3 sm:mt-4">Why virtue, and why stories?</h1>
      </header>
      <div className="measure mt-8 border-t border-rule sm:mt-10" />
      <div className="story-body essay no-dropcap measure mt-8 sm:mt-10">
        <p>
          It is almost bedtime. The lamp is on, a child is tucked under your arm,
          and you have ten minutes before lights out. You want a story worth those
          minutes: one good enough to hold a wriggling listener still, and true
          enough to leave something behind when the light goes out. Classical
          Virtues was made for that moment.
        </p>
        <h2>Why Virtue?</h2>
        <p>
          Virtues are habits practiced until they become character. Courage,
          honesty, temperance, kindness: these are not lofty abstractions but
          small daily choices, and children learn them the way they learn
          everything else, by watching and repeating. Freedom without an inner
          compass drifts. A child who rehearses small acts of courage grows into
          an adult who can be counted on.
        </p>
        <p>
          Our age is abundant in information yet starved for wisdom. The remedy
          is not more facts. It begins where character has always begun: at home,
          in the unhurried formation of habits, one story and one evening at a
          time.
        </p>
        {/* Pull quote: a line from "Our Invitation", far below, so it never
            shares a screen with its source; hidden from assistive tech so the
            sentence is read once. */}
        <figure aria-hidden="true" className="pull-quote">
          <p>Character is built in small, repeated choices.</p>
        </figure>
        <h2>Why Stories?</h2>
        <p>
          Arguments inform; stories transform. A lecture on honesty slides right
          off a six-year-old, but the boy who cried wolf stays for life. Stories
          make virtue visible. They let a child feel what steadfastness costs and
          what kindness earns, long before either word appears on a spelling
          list. Every tradition worth keeping has taught its children this way.
        </p>
        <h2>What We Are</h2>
        <p>
          Classical Virtues is a small anthology of fables and classic tales,
          chosen and edited by hand by Hunter, each picked for the virtue at its
          heart and trimmed to read-aloud length, usually a few minutes from
          first line to moral. Every story is free. Each one includes the full
          text, and some also have narrated audio, so you can read aloud
          yourself or press play and listen together. There are no ads and nothing to sign up for; the
          stories are the whole point.
        </p>
        <h2>Our Invitation</h2>
        <p>
          Read one aloud tonight. Pick a virtue your family is working on, or
          simply choose the title that sounds most promising, and see what
          conversation follows. Character is built in small, repeated choices,
          and a story before bed is a fine place to start.
        </p>
      </div>
      <footer className="measure mt-12 flex flex-col gap-8 border-t border-rule pt-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-heading text-[1.75rem] italic leading-tight">Hunter</p>
          <p className="meta mt-1">Curator, Classical Virtues</p>
        </div>
        <Link href="/stories" className="rail-link self-start sm:self-auto">
          Begin with a story <span aria-hidden="true">&rarr;</span>
        </Link>
      </footer>
      <JsonLd data={aboutJsonLd()} />
    </article>
  );
}
