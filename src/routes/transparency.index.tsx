import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PublicShell,
  PageHeader,
  EmptyState,
  LoadingCards,
  ErrorState,
} from "@/components/site/public-shell";
import { TransparencyCard } from "@/components/site/cards";
import { publishedDocumentsQuery } from "@/lib/queries";
import { TRANSPARENCY_CATEGORIES } from "@/lib/csc-types";

export const Route = createFileRoute("/transparency/")({
  head: () => ({
    meta: [
      { title: "Transparency — Computer Science Clique" },
      {
        name: "description",
        content:
          "Financial reports, audit reports, organizational documents, and policies published openly by the Computer Science Clique.",
      },
      { property: "og:title", content: "CSC Transparency Portal" },
      {
        property: "og:description",
        content: "Financial reports, audits, organizational documents, and policies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransparencyPage,
});

function TransparencyPage() {
  const { data, isPending, isError } = useQuery(publishedDocumentsQuery);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [year, setYear] = useState("all");
  const [type, setType] = useState("all");

  const years = useMemo(
    () => Array.from(new Set((data ?? []).map((d) => d.academic_year).filter(Boolean))) as string[],
    [data],
  );
  const types = useMemo(
    () => Array.from(new Set((data ?? []).map((d) => d.document_type).filter(Boolean))) as string[],
    [data],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((item) => {
      const matchesTerm =
        !term ||
        item.title.toLowerCase().includes(term) ||
        (item.description ?? "").toLowerCase().includes(term);
      return (
        matchesTerm &&
        (category === "all" || item.category === category) &&
        (year === "all" || item.academic_year === year) &&
        (type === "all" || item.document_type === type)
      );
    });
  }, [data, search, category, year, type]);

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Transparency"
        title="Transparency portal"
        description="Every financial statement, audit report, organizational document, and policy we publish is available here for the whole student body to review."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-border bg-primary-subtle p-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary-deep" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Documents listed here are officially released by the organization. Drafts and internal
            records are never published on this page.
          </p>
        </div>

        <div className="mb-8 grid gap-3 lg:grid-cols-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search documents"
              aria-label="Search documents"
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Filter by category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {TRANSPARENCY_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger aria-label="Filter by academic year">
              <SelectValue placeholder="Academic year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All academic years</SelectItem>
              {years.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger aria-label="Filter by document type">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All document types</SelectItem>
              {types.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isPending ? (
          <LoadingCards count={6} />
        ) : isError ? (
          <ErrorState />
        ) : filtered.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <TransparencyCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No documents found"
            description="Try clearing the filters or searching for another title."
          />
        )}
      </div>
    </PublicShell>
  );
}
