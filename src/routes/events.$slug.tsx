import { safeUrl } from "@/lib/safe-url";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Clock, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell, ErrorState } from "@/components/site/public-shell";
import { EventStatusBadge } from "@/components/site/cards";
import { eventQuery } from "@/lib/queries";
import { formatDate } from "@/lib/csc-types";

export const Route = createFileRoute("/events/$slug")({
  head: () => ({
    meta: [
      { title: "Event — Computer Science Clique" },
      {
        name: "description",
        content: "Event details, schedule, venue, and registration for a CSC activity.",
      },
      { property: "og:title", content: "CSC Event" },
      {
        property: "og:description",
        content: "Event details, schedule, venue, and registration for a CSC activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { slug } = Route.useParams();
  const { data, isPending, isError } = useQuery(eventQuery(slug));

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

  const details = [
    { icon: CalendarDays, label: "Date", value: formatDate(data.event_date) },
    {
      icon: Clock,
      label: "Time",
      value: data.start_time
        ? `${data.start_time}${data.end_time ? ` – ${data.end_time}` : ""}`
        : null,
    },
    { icon: MapPin, label: "Venue", value: data.location },
    { icon: User, label: "Organizer", value: data.organizer },
  ].filter((row) => Boolean(row.value));

  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/events">
            <ArrowLeft className="mr-1 size-4" /> All events
          </Link>
        </Button>

        <EventStatusBadge status={data.event_status} />
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{data.title}</h1>

        {data.image_url ? (
          <img
            src={data.image_url}
            alt={data.title}
            className="mt-8 w-full rounded-2xl border border-border object-cover"
          />
        ) : null}

        <dl className="mt-8 grid gap-4 rounded-2xl game-panel p-6 shadow-card sm:grid-cols-2">
          {details.map((row) => (
            <div key={row.label} className="flex items-start gap-3">
              <row.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="text-sm">{row.value}</dd>
              </div>
            </div>
          ))}
        </dl>

        {data.description ? (
          <p className="mt-8 whitespace-pre-line text-muted-foreground">{data.description}</p>
        ) : null}

        {data.registration_url && data.event_status === "upcoming" ? (
          <div className="mt-8">
            <Button asChild size="lg">
              <a href={safeUrl(data.registration_url)} target="_blank" rel="noreferrer">
                Register for this event
              </a>
            </Button>
          </div>
        ) : null}
      </article>
    </PublicShell>
  );
}
