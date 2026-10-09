import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicShell, ErrorState } from "@/components/site/public-shell";
import { AnnouncementCard } from "@/components/site/cards";
import { RichText } from "@/components/rich-text";
import { announcementQuery, publishedAnnouncementsQuery } from "@/lib/queries";
import { formatDate } from "@/lib/csc-types";

export const Route = createFileRoute("/announcements/$slug")({
  head: () => ({
    meta: [
      { title: "Announcement — Computer Science Clique" },
      {
        name: "description",
        content: "Read the full announcement from the Computer Science Clique.",
      },
      { property: "og:title", content: "CSC Announcement" },
      {
        property: "og:description",
        content: "Read the full announcement from the Computer Science Clique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnnouncementDetail,
});

function AnnouncementDetail() {
  const { slug } = Route.useParams();
  const { data, isPending, isError } = useQuery(announcementQuery(slug));
  const related = useQuery(publishedAnnouncementsQuery);

  if (isPending) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="h-72 animate-pulse rounded-2xl bg-secondary" />
        </div>
      </PublicShell>
    );
  }

  if (isError) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <ErrorState />
        </div>
      </PublicShell>
    );
  }

  if (!data) throw notFound();

  const relatedItems = (related.data ?? [])
    .filter((item) => item.slug !== slug && item.category === data.category)
    .slice(0, 3);

  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/announcements">
            <ArrowLeft className="mr-1 size-4" /> All announcements
          </Link>
        </Button>

        <Badge className="bg-primary-soft text-accent-foreground hover:bg-primary-soft">
          {data.category}
        </Badge>
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{data.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {data.author_name ? `${data.author_name} • ` : ""}
          Published {formatDate(data.published_at)}
          {data.updated_at && data.updated_at !== data.created_at
            ? ` • Updated ${formatDate(data.updated_at)}`
            : ""}
        </p>

        {data.featured_image ? (
          <img
            src={data.featured_image}
            alt={data.title}
            className="mt-8 w-full rounded-2xl border border-border object-cover"
          />
        ) : null}

        {data.excerpt ? (
          <p className="mt-8 text-lg text-muted-foreground">{data.excerpt}</p>
        ) : null}

        <RichText html={data.content ?? ""} className="mt-6" />
      </article>

      {relatedItems.length ? (
        <section className="border-t border-border bg-primary-subtle">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-xl font-bold">Related announcements</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedItems.map((item) => (
                <AnnouncementCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </PublicShell>
  );
}
