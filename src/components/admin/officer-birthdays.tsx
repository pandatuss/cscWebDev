import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Cake, Gift, AlertTriangle, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Officer } from "@/lib/csc-types";
import {
  ageOf,
  daysUntil,
  formatBirthdate,
  isBirthdayToday,
  manilaToday,
  officerBirthdatesQuery,
  parseBirthdate,
} from "@/lib/birthdays";

export function useManilaDay() {
  const [day, setDay] = useState(() => manilaToday().iso);
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = manilaToday().iso;
      setDay((prev) => (prev === now ? prev : now));
    }, 60000);
    return () => window.clearInterval(t);
  }, []);
  return day;
}

const SORTS = {
  upcoming: "Upcoming birthdays",
  calendar: "Birthday January → December",
  az: "Name A-Z",
  za: "Name Z-A",
  position: "Position",
  recent: "Recently added",
} as const;

function soonLabel(days: number) {
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

export function OfficerBirthdays({
  officers,
  years,
  canManage,
  onEdit,
}: {
  officers: Officer[];
  years: string[];
  canManage: boolean;
  onEdit: (o: Officer) => void;
}) {
  const day = useManilaDay();
  const bq = useQuery(officerBirthdatesQuery);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("all");
  const [sort, setSort] = useState<keyof typeof SORTS>("upcoming");

  const rows = useMemo(() => {
    const today = manilaToday();
    const map = bq.data ?? new Map<string, string>();
    const q = search.trim().toLowerCase();
    const list = officers
      .filter((o) => o.is_active)
      .filter((o) => year === "all" || o.academic_year === year)
      .filter(
        (o) =>
          !q ||
          [o.name, o.position, o.program ?? ""].some((v) => v.toLowerCase().includes(q)),
      )
      .map((o) => {
        const bd = map.get(o.id) ?? null;
        return {
          o,
          bd,
          today: bd ? isBirthdayToday(bd, today) : false,
          days: bd ? daysUntil(bd, today) : Infinity,
          age: bd ? ageOf(bd, today) : null,
        };
      });
    const cmpMissing = (a: { bd: string | null }, b: { bd: string | null }) =>
      (a.bd ? 0 : 1) - (b.bd ? 0 : 1);
    list.sort((a, b) => {
      switch (sort) {
        case "upcoming":
          return cmpMissing(a, b) || a.days - b.days || a.o.name.localeCompare(b.o.name);
        case "calendar": {
          if (!a.bd || !b.bd) return cmpMissing(a, b);
          const x = parseBirthdate(a.bd), y = parseBirthdate(b.bd);
          return x.m - y.m || x.d - y.d;
        }
        case "az":
          return a.o.name.localeCompare(b.o.name);
        case "za":
          return b.o.name.localeCompare(a.o.name);
        case "position":
          return a.o.position.localeCompare(b.o.position) || a.o.name.localeCompare(b.o.name);
        case "recent":
          return (b.o.created_at ?? "").localeCompare(a.o.created_at ?? "");
      }
    });
    return { list, today };
  }, [officers, bq.data, search, year, sort, day]);

  const all = rows.list;
  const todays = all.filter((r) => r.today);
  const soon = all
    .filter((r) => r.bd && r.days > 0 && r.days <= 2)
    .sort((a, b) => a.days - b.days || a.o.name.localeCompare(b.o.name));
  const thisMonth = all.filter((r) => r.bd && parseBirthdate(r.bd).m === rows.today.m).length;
  const upcoming = all.filter((r) => r.bd && r.days > 0 && r.days <= 30).length;
  const missing = all.filter((r) => !r.bd).length;

  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-semibold">Officer Birthdays</h2>
      <p className="text-sm text-muted-foreground">
        Manage and view officer birthdays for internal organization use.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search officers..."
          className="h-9 w-full sm:w-64"
          aria-label="Search officers"
        />
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="School year"
        >
          <option value="all">All school years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Sort birthdays"
        >
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total Officers", all.length],
          ["Birthdays Today", todays.length],
          ["This Month", thisMonth],
          ["Upcoming (30 days)", upcoming],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl game-panel p-4 shadow-card">
            <p className="font-display text-2xl font-bold">{bq.isPending ? "…" : value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {todays.length ? (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary-subtle p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Cake className="size-4 text-primary" aria-hidden="true" />
            {todays.length === 1
              ? "1 officer has a birthday today."
              : `${todays.length} officers have birthdays today.`}
          </p>
          <ul className="mt-2 space-y-0.5">
            {todays.map((r) => (
              <li key={r.o.id}>• {r.o.name} — {r.o.position} · {r.o.academic_year ?? "No school year"}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {soon.length ? (
        <div className="mt-3 rounded-2xl border border-primary/20 bg-secondary/40 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Gift className="size-4 text-primary" aria-hidden="true" />
            {soon.length === 1
              ? "1 birthday is coming up"
              : `${soon.length} birthdays are coming up`}
          </p>
          <ul className="mt-2 space-y-0.5">
            {soon.map((r) => (
              <li key={r.o.id}>
                • {r.o.name} — {r.o.position} · {r.o.academic_year ?? "No school year"} ·{" "}
                {soonLabel(r.days)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {missing > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5" /> {missing} officer{missing === 1 ? " has" : "s have"} no
          birthdate yet{canManage ? " — use Edit to add one." : "."}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-2xl game-panel shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Officer</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">School Year</th>
              <th className="px-4 py-3">Birthdate</th>
              <th className="px-4 py-3">Age</th>
              {canManage && <th className="px-4 py-3 text-right">Edit</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bq.isPending ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : bq.isError ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-destructive">Couldn't load birthdays. Please refresh.</td></tr>
            ) : all.length ? (
              all.map((r) => (
                <tr key={r.o.id} className={r.today ? "bg-primary-subtle/60" : undefined}>
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-2">
                      {r.o.name}
                      {r.today ? (
                        <Badge className="gap-1"><Cake className="size-3" /> Today</Badge>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.o.position}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.o.academic_year ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.bd ? (
                      formatBirthdate(r.bd)
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <AlertTriangle className="size-3.5" /> Birthdate missing
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.age ?? "—"}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" aria-label="Edit birthdate" onClick={() => onEdit(r.o)}>
                        <Pencil className="size-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No matching officers.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
