import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { AnnouncementCard } from "@/components/site/cards";
import { publishedAnnouncementsQuery } from "@/lib/queries";
import { ANNOUNCEMENT_CATEGORIES } from "@/lib/csc-types";

const PAGE_SIZE = 6;

export const Route = createFileRoute("/announcements/")({
  head: () => ({
    meta: [
      { title: "Announcements — Computer Science Clique" },
      {
        name: "description",
        content:
          "Official announcements from the Computer Science Clique. Search and filter updates by category and date.",
      },
      { property: "og:title", content: "CSC Announcements" },
      {
        property: "og:description",
        content: "Official announcements and updates from the Computer Science Clique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { data, isPending, isError } = useQuery(publishedAnnouncementsQuery);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = (data ?? []).filter((item) => {
      const matchesTerm =
        !term ||
        item.title.toLowerCase().includes(term) ||
        (item.excerpt ?? "").toLowerCase().includes(term);
      const matchesCategory = category === "all" || item.category === category;
      return matchesTerm && matchesCategory;
    });
    return rows.sort((a, b) => {
      const left = new Date(a.published_at ?? a.created_at).getTime();
      const right = new Date(b.published_at ?? b.created_at).getTime();
      return sort === "newest" ? right - left : left - right;
    });
  }, [data, search, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Announcements"
        title="Announcements"
        description="Official updates, reminders, and news for Computer Science students."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search announcements"
              aria-label="Search announcements"
              className="pl-9"
            />
          </div>
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-48" aria-label="Filter by category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ANNOUNCEMENT_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="sm:w-44" aria-label="Sort by date">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isPending ? (
          <LoadingCards count={6} />
        ) : isError ? (
          <ErrorState />
        ) : visible.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => (
                <AnnouncementCard key={item.id} item={item} />
              ))}
            </div>
            {totalPages > 1 ? (
              <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="No announcements found"
            description="Try a different search term or category."
          />
        )}
      </div>
    </PublicShell>
  );
}
