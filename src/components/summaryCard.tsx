import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HeadphonesIcon } from 'lucide-react';

type SummaryCardVariant = 'featured' | 'contents' | 'index';

interface SummaryCardProps {
  slug: string;
  title: string;
  image?: string;
  summary?: string;
  virtue?: string;
  audioUrl?: string;
  wordCount?: number;
  /** 'featured' = large lead story, 'contents' = compact cover list row, 'index' = full table-of-contents row */
  variant?: SummaryCardVariant;
  /** Position number shown in the 'index' variant, like a table of contents */
  position?: number;
}

/** Read-aloud pace of roughly 140 words per minute, rounded to whole minutes. */
function readAloudMinutes(wordCount?: number): string | null {
  if (!wordCount || wordCount <= 0) return null;
  return `${Math.max(1, Math.round(wordCount / 140))} min`;
}

const Separator = () => (
  <span aria-hidden="true" className="text-border">
    &middot;
  </span>
);

const StoryMeta = ({
  virtue,
  minutes,
  hasAudio,
  audioLabel = 'Listen',
  className = '',
}: {
  virtue?: string;
  minutes: string | null;
  hasAudio: boolean;
  audioLabel?: string;
  className?: string;
}) => {
  if (!virtue && !minutes && !hasAudio) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground ${className}`}>
      {virtue && (
        <span className="font-heading italic text-base text-primary">{virtue}</span>
      )}
      {virtue && (minutes || hasAudio) && <Separator />}
      {minutes && <span>{minutes}</span>}
      {minutes && hasAudio && <Separator />}
      {hasAudio && (
        <span className="inline-flex items-center gap-1.5">
          <HeadphonesIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {audioLabel}
        </span>
      )}
    </p>
  );
};

const SummaryCard: React.FC<SummaryCardProps> = ({
  slug,
  title,
  image,
  summary,
  virtue,
  audioUrl,
  wordCount,
  variant = 'index',
  position,
}) => {
  const minutes = readAloudMinutes(wordCount);
  const hasAudio = Boolean(audioUrl);
  const href = `/stories/${slug}`;

  if (variant === 'featured') {
    return (
      <Link
        href={href}
        className="group block border border-border bg-card transition-colors duration-200 hover:border-foreground"
      >
        <article className="grid md:grid-cols-5">
          {image && (
            <div className="relative aspect-[3/2] md:col-span-3 md:aspect-auto md:min-h-[22rem]">
              <Image
                src={image}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 640px"
                className="object-cover object-top"
              />
            </div>
          )}
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 md:col-span-2">
            <StoryMeta
              virtue={virtue}
              minutes={minutes}
              hasAudio={hasAudio}
              audioLabel="Narrated audio"
            />
            <h2 className="font-heading text-3xl leading-tight underline-offset-4 decoration-1 group-hover:underline sm:text-4xl">
              {title}
            </h2>
            {summary && (
              <p className="leading-relaxed text-secondary-foreground">{summary}</p>
            )}
          </div>
        </article>
      </Link>
    );
  }

  if (variant === 'contents') {
    return (
      <Link
        href={href}
        className="group flex items-center gap-4 border-b border-border py-4 transition-colors duration-200 hover:border-foreground sm:gap-5"
      >
        {image && (
          <div className="relative h-16 w-16 shrink-0">
            <Image src={image} alt="" fill sizes="64px" className="object-cover object-top" />
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <h2 className="font-heading text-xl leading-snug underline-offset-4 decoration-1 group-hover:underline sm:text-2xl">
            {title}
          </h2>
          <StoryMeta virtue={virtue} minutes={minutes} hasAudio={hasAudio} />
        </div>
      </Link>
    );
  }

  // 'index' variant: full table-of-contents row
  return (
    <Link
      href={href}
      className="group flex gap-4 border-b border-border py-6 transition-colors duration-200 hover:border-foreground sm:gap-6 sm:py-7"
    >
      {typeof position === 'number' && (
        <span
          aria-hidden="true"
          className="hidden w-6 shrink-0 pt-1 text-right font-heading text-lg text-muted-foreground sm:block"
        >
          {position}
        </span>
      )}
      {image && (
        <div className="relative h-20 w-20 shrink-0 sm:h-28 sm:w-28">
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 640px) 80px, 112px"
            className="object-cover object-top"
          />
        </div>
      )}
      <div className="min-w-0 space-y-1.5">
        <h2 className="font-heading text-2xl leading-snug underline-offset-4 decoration-1 group-hover:underline">
          {title}
        </h2>
        <StoryMeta virtue={virtue} minutes={minutes} hasAudio={hasAudio} />
        {summary && (
          <p className="text-sm leading-relaxed text-secondary-foreground sm:text-base">
            {summary}
          </p>
        )}
      </div>
    </Link>
  );
};

export default SummaryCard;
