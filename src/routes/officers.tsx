import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PublicShell, PageHeader, EmptyState, LoadingCards, ErrorState } from "@/components/site/public-shell";
import { OfficerCard } from "@/components/site/cards";
import { activeOfficersQuery, settingsQuery } from "@/lib/queries";
import { OFFICER_POSITIONS } from "@/lib/csc-types";

export const Route = createFileRoute("/officers")({
  head: () => ({
    meta: [
      { title: "Officers — Computer Science Clique" },
      {
        name: "description",
        content:
          "Meet the elected officers and committee heads leading the Computer Science Clique this academic year.",
      },
      { property: "og:title", content: "CSC Officers" },
      {
        property: "og:description",
        content: "The students leading the Computer Science Clique this academic year.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OfficersPage,
});

function OfficersPage() {
  const { data, isPending, isError } = useQuery(activeOfficersQuery);
  const { data: settings } = useQuery(settingsQuery);

  const all = data ?? [];
  const years = Array.from(
    new Set(all.map((o) => o.academic_year).filter((y): y is string => !!y)),
  ).sort().reverse();
  const [picked, setPicked] = useState<string | null>(null);
  const defaultYear =
    settings?.academic_year && years.includes(settings.academic_year)
      ? settings.academic_year
      : years[0] ?? null;
  const year = picked && years.includes(picked) ? picked : defaultYear;
  const officers = year ? all.filter((o) => o.academic_year === year) : all;
  const executive = officers.filter((item) =>
    (OFFICER_POSITIONS as readonly string[]).includes(item.position),
  );
  const committee = officers.filter(
    (item) => !(OFFICER_POSITIONS as readonly string[]).includes(item.position),
  );

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Officers"
        title="Meet the CSC officers"
        description={`The elected leaders and committee heads serving for ${year ?? settings?.academic_year ?? "this academic year"}.`}
      />

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6">
        {years.length > 1 ? (
          <div className="flex items-center gap-3">
            <label htmlFor="sy" className="text-sm font-semibold">School year</label>
            <select
              id="sy"
              value={year ?? ""}
              onChange={(e) => setPicked(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        ) : null}
        {isPending ? (
          <LoadingCards count={4} />
        ) : isError ? (
          <ErrorState />
        ) : officers.length ? (
          <>
            <section>
              <h2 className="text-xl font-bold">Executive board</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {executive.map((item) => (
                  <OfficerCard key={item.id} item={item} />
                ))}
              </div>
            </section>

            {committee.length ? (
              <section>
                <h2 className="text-xl font-bold">Committee heads</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {committee.map((item) => (
                    <OfficerCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <EmptyState title="Officers will be announced soon" />
        )}
      </div>
    </PublicShell>
  );
}
