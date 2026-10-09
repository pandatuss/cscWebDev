import { safeUrl } from "@/lib/safe-url";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Target, Eye, CheckCircle2 } from "lucide-react";
import { PublicShell, PageHeader } from "@/components/site/public-shell";
import { settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Computer Science Clique" },
      {
        name: "description",
        content:
          "Learn about the Computer Science Clique: who we are, our mission and vision, objectives, and organization information.",
      },
      { property: "og:title", content: "About the Computer Science Clique" },
      {
        property: "og:description",
        content: "Our mission, vision, objectives, and organization information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: settings } = useQuery(settingsQuery);
  const objectives: string[] = Array.isArray(settings?.objectives)
    ? (settings.objectives as unknown[])
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const o = item as { title?: unknown; description?: unknown };
            const title = typeof o.title === "string" ? o.title : "";
            const desc = typeof o.description === "string" ? o.description : "";
            return title && desc ? `${title} — ${desc}` : title || desc;
          }
          return "";
        })
        .filter(Boolean)
    : [];

  const info = [
    { label: "Organization name", value: settings?.organization_name },
    { label: "College / Department", value: settings?.college },
    { label: "School", value: settings?.school },
    { label: "Academic year", value: settings?.academic_year },
    { label: "Established", value: settings?.established_date },
    { label: "Official email", value: settings?.email },
    { label: "Office location", value: settings?.office_location },
  ].filter((row) => Boolean(row.value));

  const socials = (settings?.social_links ?? {}) as Record<string, string>;

  return (
    <PublicShell>
      <PageHeader
        eyebrow="About"
        title="About the Computer Science Clique"
        description={settings?.tagline ?? undefined}
      />

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-14 sm:px-6">
        <section>
          <h2 className="text-2xl font-bold">Who we are</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            {settings?.about_text ??
              "The Computer Science Clique is the official student organization of Computer Science students."}
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl game-panel p-6 shadow-card">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground">
              <Target className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-semibold">Our mission</h2>
            <p className="mt-2 text-sm text-muted-foreground">{settings?.mission ?? "—"}</p>
          </div>
          <div className="rounded-2xl game-panel p-6 shadow-card">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-accent-foreground">
              <Eye className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-semibold">Our vision</h2>
            <p className="mt-2 text-sm text-muted-foreground">{settings?.vision ?? "—"}</p>
          </div>
        </section>

        {objectives.length ? (
          <section>
            <h2 className="text-2xl font-bold">Our objectives</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {objectives.map((objective) => (
                <div
                  key={objective}
                  className="flex gap-3 rounded-2xl game-panel p-5 shadow-card"
                >
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">{objective}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="text-2xl font-bold">Organization information</h2>
          <dl className="mt-6 grid gap-x-8 gap-y-4 rounded-2xl game-panel p-6 shadow-card sm:grid-cols-2">
            {info.map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="mt-1 text-sm">{row.value}</dd>
              </div>
            ))}
            {Object.keys(socials).length ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Social links
                </dt>
                <dd className="mt-2 flex flex-wrap gap-3 text-sm">
                  {Object.entries(socials).map(([name, url]) => (
                    <a
                      key={name}
                      href={safeUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-deep hover:underline"
                    >
                      {name}
                    </a>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>
    </PublicShell>
  );
}
