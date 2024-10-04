import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

interface SummaryCardProps {
  fileName: string;
  image?: string;
  title?: string;
  summary?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ fileName, image, title, summary }) => {
  return (
    <Link href={`/stories/${fileName.replace('.mdx', '')}`}>
      <Card className="rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 h-80 flex flex-col">
        {image && (
          <div className="h-60 relative">
            <Image src={image} alt={title || 'Virtue image'} fill className="object-cover object-top rounded-t-lg"  />
          </div>
        )}
        <CardContent className="p-4 space-y-2 flex-grow flex flex-col justify-between">
          {title && <CardTitle className="line-clamp-2 pb-1">{title}</CardTitle>}
          {summary && <CardDescription className="line-clamp-3">{summary}</CardDescription>}
        </CardContent>
      </Card>
    </Link>
  );
};

export default SummaryCard;
