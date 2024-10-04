import Link from "next/link";
import { Input } from "@/components/ui/input";
import SummaryCard from "@/components/summaryCard";
import { getAllPosts, PostData } from "@/lib/posts";

export default function Home() {
  const virtues: PostData[] = getAllPosts();
  console.log('Virtues:', virtues);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-4xl w-full space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter">Classical Virtues</h1>
          <p className="text-muted-foreground text-lg">
            Timeless virtues taught through tales from the past.
          </p>
        </header>

        <div className="flex justify-center">
          <Input type="search" placeholder="Search virtue stories..." className="max-w-md w-full" />
        </div>

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

          <div className="flex justify-center">
            <Link
              href="#"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              See More
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
