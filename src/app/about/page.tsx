import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Classical Virtues',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-4xl font-heading font-bold">About</h1>
      <p className="italic">“What we choose continuously, we become.”</p>
      <h2 className="text-2xl font-heading font-bold mt-6">Why Virtue?</h2>
      <p>
        Freedom without an inner compass devolves into chaos, and power without
        principle corrupts those who hold it. Virtues are cultivated habits that
        direct human freedom toward goodness—aligning desires with duties,
        strength with justice, and thoughts with truth. Virtues affirm a moral
        order beyond individual preferences, uphold human dignity, and foster
        genuine flourishing when embraced.
      </p>
      <p>
        Our modern age, abundant in information yet starved for wisdom,
        struggles under the weight of choice and distraction. Institutions
        falter, trust erodes, and cynicism grows pervasive. These problems
        aren&apos;t primarily technical; they are moral and spiritual.
        Rejuvenating society thus begins where its deterioration started: in the
        careful formation of character.
      </p>
      <h2 className="text-2xl font-heading font-bold mt-6">Why Stories?</h2>
      <p>
        Arguments inform; stories transform. Narratives featuring steadfast
        Ruth, disciplined Epictetus, self‑sacrificing Frodo, or repentant
        Frederick Douglass vividly illustrate virtues in action, making abstract
        concepts tangible and compelling. Stories shape our moral imagination,
        inspiring us to emulate what is noble and avoid what is base. Long
        before a child learns ethical definitions, stories embed moral lessons
        deeply into their consciousness.
      </p>
      <h2 className="text-2xl font-heading font-bold mt-6">What We Are</h2>
      <p>
        We offer a quiet, curated sanctuary filled with timeless narratives,
        fables, myths, speeches, letters, biographies, and modern parables. Each
        story is paired with a concise introductory note to guide reflection.
        This site is intentionally free of distractions, offering instead a
        peaceful reading space where timeless wisdom meets modern seekers.
      </p>
      <h2 className="text-2xl font-heading font-bold mt-6">Our Invitation</h2>
      <p>
        Civilizations are renewed from the inside out. Nourish your interior
        life here, and carry these virtues into the communities and
        relationships you cherish. When enough individuals consistently choose
        the good, societies regain the strength and resilience necessary for
        liberty, peace, and genuine human flourishing.
      </p>
    </div>
  );
}
