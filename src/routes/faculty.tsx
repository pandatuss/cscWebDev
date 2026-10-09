import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PublicShell,
  PageHeader,
  EmptyState,
  LoadingCards,
  ErrorState,
} from "@/components/site/public-shell";
import { FacultyCard } from "@/components/site/cards";
import { activeFacultyQuery, settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty — Computer Science Clique" },
      {
        name: "description",
        content:
          "Meet the faculty members and advisers of the Department of Computer Studies who guide the Computer Science Clique.",
      },
      { property: "og:title", content: "Faculty — Computer Science Clique" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content:
          "Meet the faculty members and advisers who guide the Computer Science Clique.",
      },
    ],
  }),
  component: FacultyPage,
});

function FacultyPage() {
  const faculty = useQuery(activeFacultyQuery);
  const { data: settings } = useQuery(settingsQuery);
  const members = faculty.data ?? [];

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Faculty"
        title="Meet our faculty"
        description={`The faculty members of the ${
          settings?.college ?? "Department of Computer Studies"
        } who guide and mentor the Computer Science Clique.`}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {faculty.isPending ? (
          <LoadingCards count={4} />
        ) : faculty.isError ? (
          <ErrorState />
        ) : members.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((item) => (
              <FacultyCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Faculty profiles will be added soon"
            description="Check back again shortly."
          />
        )}
      </div>
    </PublicShell>
  );
}
