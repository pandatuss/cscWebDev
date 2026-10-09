import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Users, Megaphone, CalendarDays, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell, EmptyState, LoadingCards } from "@/components/site/public-shell";
import { CscLogo } from "@/components/site/csc-logo";
import { AnnouncementCard, EventCard, OfficerCard } from "@/components/site/cards";
import {
  settingsQuery,
  publishedAnnouncementsQuery,
  publishedEventsQuery,
  activeOfficersQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Computer Science Clique — Official Student Organization Hub" },
      {
        name: "description",
        content:
          "Building a connected, transparent, and collaborative community for Computer Science students. Read announcements, join events, and review our transparency reports.",
      },
      { property: "og:title", content: "Computer Science Clique" },
      {
        property: "og:description",
        content:
          "Building a connected, transparent, and collaborative community for Computer Science students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string | undefined;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-rise-in mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function HomePage() {
  const { data: settings } = useQuery(settingsQuery);
  const announcements = useQuery(publishedAnnouncementsQuery);
  const events = useQuery(publishedEventsQuery);
  const officers = useQuery(activeOfficersQuery);

  const latestAnnouncements = (announcements.data ?? []).slice(0, 3);
  const upcomingEvents = (events.data ?? [])
    .filter((item) => item.event_status === "upcoming" || item.event_status === "ongoing")
    .slice(0, 3);
  const allOfficers = officers.data ?? [];
  const latestYear = allOfficers
    .map((item) => item.academic_year)
    .filter((year): year is string => !!year)
    .sort()
    .at(-1);
  const previewOfficers = allOfficers
    .filter((item) => !latestYear || item.academic_year === latestYear)
    .slice(0, 4);

  return (
    <PublicShell>
      <section className="surface-wash border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="flex flex-col items-center gap-10 text-center lg:flex-row lg:justify-between lg:gap-16 lg:text-left">
          <div className="max-w-3xl">
            <p className="animate-rise-in text-xs font-semibold uppercase tracking-[0.18em] text-primary-deep">
              {settings?.college ?? "Department of Computer Studies"}
            </p>
            <h1 className="animate-rise-in motion-delay-1 mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              {settings?.organization_name ?? "Computer Science Clique"}
            </h1>
            <p className="animate-rise-in motion-delay-2 mt-5 max-w-xl text-lg text-muted-foreground lg:mx-0 mx-auto">
              {settings?.tagline ??
                "Building a connected, transparent, and collaborative community for Computer Science students."}
            </p>
            <div className="animate-rise-in motion-delay-3 mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Button asChild size="lg">
                <Link to="/about">Explore CSC</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/transparency">View Transparency</Link>
              </Button>
            </div>
          </div>
          <div className="relative" aria-hidden="true">
            <div className="absolute -inset-10 rounded-full bg-primary-soft blur-3xl" />
            <div className="animate-logo-float relative rounded-full bg-card p-2 shadow-lift ring-1 ring-border">
              <CscLogo className="size-40 sm:size-52 lg:size-64" />
            </div>
          </div>
        </div>
        </div>
      </section>


      <section className="border-y border-border bg-primary-subtle">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading
            title="Latest announcements"
            description="Official updates from the Computer Science Clique."
            action={
              <Button asChild variant="outline">
                <Link to="/announcements">View All Announcements</Link>
              </Button>
            }
          />
          {announcements.isPending ? (
            <LoadingCards />
          ) : latestAnnouncements.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestAnnouncements.map((item) => (
                <AnnouncementCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState title="No announcements yet" description="Check back again soon." />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          title="Upcoming events"
          description="Join our workshops, assemblies, and campus activities."
          action={
            <Button asChild variant="outline">
              <Link to="/events">View All Events</Link>
            </Button>
          }
        />
        {events.isPending ? (
          <LoadingCards />
        ) : upcomingEvents.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((item) => (
              <EventCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No upcoming events"
            description="New activities will be posted here once scheduled."
          />
        )}
      </section>

      <section className="border-y border-border bg-primary-subtle">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="animate-rise-in">
            <h2 className="text-2xl font-bold sm:text-3xl">Transparency matters</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Every peso collected and every decision made belongs to the students we serve. Our
              financial statements, audit reports, organizational documents, and policies are
              published openly so anyone can review them.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link to="/transparency">Open the transparency portal</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Financial Reports", "Audit Reports", "Organizational Documents", "Policies"].map(
              (label, index) => (
                <div
                  key={label}
                  className={`animate-rise-in rounded-2xl game-panel p-4 text-sm font-medium shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${index % 2 ? "motion-delay-1" : ""}`}
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          title="Your officers"
          description="The students leading the organization this academic year."
          action={
            <Button asChild variant="outline">
              <Link to="/officers">Meet the CSC Officers</Link>
            </Button>
          }
        />
        {officers.isPending ? (
          <LoadingCards count={4} />
        ) : previewOfficers.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {previewOfficers.map((item) => (
              <OfficerCard key={item.id} item={{ ...item, biography: null }} />
            ))}
          </div>
        ) : (
          <EmptyState title="Officers will be announced soon" />
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          title="Who we are"
          description={settings?.about_text ?? undefined}
          action={
            <Button asChild variant="ghost">
              <Link to="/about">
                More about CSC <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Megaphone,
              title: "Clear communication",
              text: "Official announcements published in one reliable place for every student.",
            },
            {
              icon: CalendarDays,
              title: "Active student life",
              text: "Workshops, seminars, and competitions that build real technical skill.",
            },
            {
              icon: ShieldCheck,
              title: "Open transparency",
              text: "Financial and audit reports available for the whole student body to review.",
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className={`group animate-rise-in rounded-2xl game-panel p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${index === 1 ? "motion-delay-1" : index === 2 ? "motion-delay-2" : ""}`}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground transition-transform duration-300 group-hover:scale-110">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="animate-rise-in mt-10 flex items-center gap-3 rounded-2xl border border-border bg-secondary/60 p-6">
          <Users className="size-5 text-primary-deep" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Want to get involved or have a question? {" "}
            <Link to="/contact" className="font-medium text-primary-deep hover:underline">
              Contact the organization
            </Link>
            .
          </p>
        </div>
      </section>


    </PublicShell>
  );
}
