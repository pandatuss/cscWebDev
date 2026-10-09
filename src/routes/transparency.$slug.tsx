import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicShell, ErrorState } from "@/components/site/public-shell";
import { documentQuery } from "@/lib/queries";
import { formatDate } from "@/lib/csc-types";

export const Route = createFileRoute("/transparency/$slug")({
  head: () => ({
    meta: [
      { title: "Transparency document — Computer Science Clique" },
      {
        name: "description",
        content: "View an officially published CSC transparency document.",
      },
      { property: "og:title", content: "CSC Transparency Document" },
      {
        property: "og:description",
        content: "View an officially published CSC transparency document.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentDetail,
});

function DocumentDetail() {
  const { slug } = Route.useParams();
  const { data, isPending, isError } = useQuery(documentQuery(slug));

  if (isPending) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="h-80 animate-pulse rounded-2xl bg-secondary" />
        </div>
      </PublicShell>
    );
  }

  if (isError) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <ErrorState />
        </div>
      </PublicShell>
    );
  }

  if (!data) throw notFound();

  const isImage = ["PNG", "JPG", "JPEG", "WEBP"].includes(
    (data.document_type ?? "").toUpperCase(),
  );

  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/transparency">
            <ArrowLeft className="mr-1 size-4" /> Transparency portal
          </Link>
        </Button>

        <Badge variant="outline">{data.category}</Badge>
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{data.title}</h1>
        {data.description ? (
          <p className="mt-4 text-muted-foreground">{data.description}</p>
        ) : null}

        <dl className="mt-8 grid gap-4 rounded-2xl game-panel p-6 shadow-card sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Academic year
            </dt>
            <dd className="mt-1 text-sm">{data.academic_year ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Published
            </dt>
            <dd className="mt-1 text-sm">{formatDate(data.published_at)}</dd>
          </div>
        </dl>

        {data.file_url && isImage ? (
          <img
            src={data.file_url}
            alt={data.title}
            className="mt-8 w-full rounded-2xl border border-border"
          />
        ) : null}
      </div>
    </PublicShell>
  );
}
