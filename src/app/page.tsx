import SummaryCard from "@/components/summaryCard";
import { getAllPosts, PostData } from "@/lib/posts";
import { useMemo } from 'react';

export default function Home() {
  const virtues: PostData[] = useMemo(() => getAllPosts(), []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-4xl w-full space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter">Classical Virtues</h1>
          <p className="text-muted-foreground text-lg">
            Timeless virtues taught through tales from the past.
          </p>
        </header>

        <main className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {virtues.map((virtue) => (
              <SummaryCard
                key={virtue.fileName}
                fileName={virtue.fileName}
                image={virtue.image}
                title={virtue.title}
                summary={virtue.summary}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
