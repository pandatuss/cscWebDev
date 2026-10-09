import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, FileText, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentImage } from "@/components/site/content-image";
import { formatDate, formatFileSize } from "@/lib/csc-types";
import type { Announcement, EventRow, Officer, FacultyMember, TransparencyDocument } from "@/lib/csc-types";

export function AnnouncementCard({ item }: { item: Announcement }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl game-panel shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <ContentImage src={item.featured_image} alt={item.title} />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary-soft text-accent-foreground hover:bg-primary-soft">
            {item.category}
          </Badge>
          {item.is_featured ? <Badge variant="outline">Featured</Badge> : null}
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold leading-snug">
          <Link
            to="/announcements/$slug"
            params={{ slug: item.slug }}
            className="hover:text-primary-deep"
          >
            {item.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{item.excerpt}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formatDate(item.published_at)}</span>
          <Button asChild variant="ghost" size="sm">
            <Link to="/announcements/$slug" params={{ slug: item.slug }}>
              Read more <ArrowRight className="ml-1 size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

const statusStyles: Record<string, string> = {
  upcoming: "bg-primary-soft text-accent-foreground hover:bg-primary-soft",
  ongoing: "bg-success text-success-foreground hover:bg-success",
  completed: "bg-secondary text-secondary-foreground hover:bg-secondary",
  cancelled: "bg-destructive/10 text-destructive hover:bg-destructive/10",
};

export function EventStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`w-fit ${statusStyles[status] ?? statusStyles["upcoming"]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function EventCard({ item }: { item: EventRow }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl game-panel shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <ContentImage src={item.image_url} alt={item.title} />
      <div className="flex flex-1 flex-col p-6">
        <div><EventStatusBadge status={item.event_status} /></div>
        <h3 className="mt-3 font-display text-lg font-semibold leading-snug">
          <Link to="/events/$slug" params={{ slug: item.slug }} className="hover:text-primary-deep">
            {item.title}
          </Link>
        </h3>
        <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <dd>{formatDate(item.event_date)}</dd>
          </div>
          {item.start_time ? (
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              <dd>
                {item.start_time}
                {item.end_time ? ` – ${item.end_time}` : ""}
              </dd>
            </div>
          ) : null}
          {item.location ? (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <dd>{item.location}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-5">
          <Button asChild variant="outline" size="sm">
            <Link to="/events/$slug" params={{ slug: item.slug }}>
              View event
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function TransparencyCard({ item }: { item: TransparencyDocument }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl game-panel shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <ContentImage src={null} alt={item.title} />
      <div className="flex flex-1 flex-col p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div>
          <Badge variant="outline">{item.category}</Badge>
          <h3 className="mt-2 font-display text-base font-semibold leading-snug">
            <Link
              to="/transparency/$slug"
              params={{ slug: item.slug }}
              className="hover:text-primary-deep"
            >
              {item.title}
            </Link>
          </h3>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{item.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <dt className="font-medium text-foreground">Academic year</dt>
          <dd>{item.academic_year ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Published</dt>
          <dd>{formatDate(item.published_at)}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Type</dt>
          <dd>{item.document_type ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">File size</dt>
          <dd>{formatFileSize(item.file_size)}</dd>
        </div>
      </dl>
      <div className="mt-5">
        <Button asChild size="sm">
          <Link to="/transparency/$slug" params={{ slug: item.slug }}>
            View details
          </Link>
        </Button>
      </div>
      </div>
    </article>
  );
}

export function OfficerCard({ item }: { item: Officer }) {
  const initials = item.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <article className="group rounded-2xl game-panel p-6 text-center shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {item.photo_url ? (
        <img
          src={item.photo_url}
          alt={item.name}
          loading="lazy"
          className="mx-auto size-24 rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <span className="mx-auto flex size-24 items-center justify-center rounded-full bg-primary-soft font-display text-xl font-bold text-accent-foreground transition-transform duration-300 group-hover:scale-105">
          {initials}
        </span>
      )}
      <h3 className="mt-4 font-display text-base font-semibold">{item.name}</h3>
      <p className="text-sm font-medium text-primary-deep">{item.position}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {[item.program, item.academic_year].filter(Boolean).join(" • ") || "—"}
      </p>
      {item.biography ? (
        <p className="mt-3 text-sm text-muted-foreground">{item.biography}</p>
      ) : null}
    </article>
  );
}

export function FacultyCard({ item }: { item: FacultyMember }) {
  const initials = item.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <article className="group rounded-2xl game-panel p-6 text-center shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {item.photo_url ? (
        <img
          src={item.photo_url}
          alt={item.name}
          loading="lazy"
          className="mx-auto size-24 rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <span className="mx-auto flex size-24 items-center justify-center rounded-full bg-primary-soft font-display text-xl font-bold text-accent-foreground transition-transform duration-300 group-hover:scale-105">
          {initials}
        </span>
      )}
      <h3 className="mt-4 font-display text-base font-semibold">{item.name}</h3>
      <p className="text-sm font-medium text-primary-deep">{item.title || "N/A"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{item.department ?? "—"}</p>
      {item.email ? (
        <a
          href={`mailto:${item.email}`}
          className="mt-3 inline-block text-xs font-medium text-primary-deep hover:underline"
        >
          {item.email}
        </a>
      ) : null}
    </article>
  );
}
