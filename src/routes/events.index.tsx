import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
import { EventCard } from "@/components/site/cards";
import { publishedEventsQuery } from "@/lib/queries";
import { EVENT_STATUSES } from "@/lib/csc-types";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Events — Computer Science Clique" },
      {
        name: "description",
        content:
          "Workshops, seminars, assemblies, and competitions hosted by the Computer Science Clique.",
      },
      { property: "og:title", content: "CSC Events" },
      {
        property: "og:description",
        content: "Upcoming and past activities of the Computer Science Clique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { data, isPending, isError } = useQuery(publishedEventsQuery);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((item) => {
      const matchesTerm =
        !term ||
        item.title.toLowerCase().includes(term) ||
        (item.location ?? "").toLowerCase().includes(term);
      const matchesStatus = status === "all" || item.event_status === status;
      return matchesTerm && matchesStatus;
    });
  }, [data, search, status]);

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Events"
        title="Events and activities"
        description="Find out what the organization is running this term and how to join."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events"
              aria-label="Search events"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-48" aria-label="Filter by event status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {EVENT_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
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
              <EventCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No events found"
            description="Try another search term or status filter."
          />
        )}
      </div>
    </PublicShell>
  );
}
