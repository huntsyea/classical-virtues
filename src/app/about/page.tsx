import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Why virtue, and why stories? Learn how Classical Virtues uses timeless narratives to cultivate character, wisdom, and moral imagination.',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
      <h1 className="text-4xl font-heading">About</h1>
      <p className="leading-relaxed">
        It is almost bedtime. The lamp is on, a child is tucked under your arm,
        and you have ten minutes before lights out. You want a story worth those
        minutes: one good enough to hold a wriggling listener still, and true
        enough to leave something behind when the light goes out. Classical
        Virtues was made for that moment.
      </p>
      <h2 className="text-2xl font-heading mt-6">Why Virtue?</h2>
      <p className="leading-relaxed">
        Virtues are habits practiced until they become character. Courage,
        honesty, temperance, kindness: these are not lofty abstractions but
        small daily choices, and children learn them the way they learn
        everything else, by watching and repeating. Freedom without an inner
        compass drifts. A child who rehearses small acts of courage grows into
        an adult who can be counted on.
      </p>
      <p className="leading-relaxed">
        Our age is abundant in information yet starved for wisdom. The remedy
        is not more facts. It begins where character has always begun: at home,
        in the unhurried formation of habits, one story and one evening at a
        time.
      </p>
      <h2 className="text-2xl font-heading mt-6">Why Stories?</h2>
      <p className="leading-relaxed">
        Arguments inform; stories transform. A lecture on honesty slides right
        off a six-year-old, but the boy who cried wolf stays for life. Stories
        make virtue visible. They let a child feel what steadfastness costs and
        what kindness earns, long before either word appears on a spelling
        list. Every tradition worth keeping has taught its children this way.
      </p>
      <h2 className="text-2xl font-heading mt-6">What We Are</h2>
      <p className="leading-relaxed">
        Classical Virtues is a small, curated anthology of fables and classic
        tales, each chosen for the virtue at its heart and lightly edited for
        read-aloud length, usually a few minutes from first line to moral.
        Every story is free. Each one includes the full text and narrated
        audio, so you can read aloud yourself or press play and listen
        together. There are no ads and nothing to sign up for; the stories are
        the whole point.
      </p>
      <h2 className="text-2xl font-heading mt-6">Our Invitation</h2>
      <p className="leading-relaxed">
        Read one aloud tonight. Pick a virtue your family is working on, or
        simply choose the title that sounds most promising, and see what
        conversation follows. Character is built in small, repeated choices,
        and a story before bed is a fine place to start.
      </p>
      <p className="pt-2">
        <Link
          href="/stories"
          className="inline-block bg-primary text-primary-foreground px-8 py-4 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Begin with a story
        </Link>
      </p>
    </div>
  );
}
