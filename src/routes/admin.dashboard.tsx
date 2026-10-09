import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, CalendarDays, FileText, Users, FilePen, Mail, Cake, Gift } from "lucide-react";
import { daysUntil, isBirthdayToday, officerBirthdatesQuery } from "@/lib/birthdays";
import { useManilaDay } from "@/components/admin/officer-birthdays";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  allAnnouncementsQuery,
  allEventsQuery,
  allDocumentsQuery,
  allOfficersQuery,
  auditLogsQuery,
  contactMessagesQuery,
} from "@/lib/queries";
import { formatDate } from "@/lib/csc-types";
import { useAdminRole, useSession } from "@/hooks/use-csc-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: dashboard." },
      { property: "og:title", content: "Dashboard — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const announcements = useQuery(allAnnouncementsQuery);
  const events = useQuery(allEventsQuery);
  const documents = useQuery(allDocumentsQuery);
  const officers = useQuery(allOfficersQuery);
  const logs = useQuery(auditLogsQuery);
  const messages = useQuery(contactMessagesQuery);
  const birthdates = useQuery(officerBirthdatesQuery);
  const manilaDay = useManilaDay();
  const { session } = useSession();
  const roleQuery = useAdminRole(session?.user.id);
  const isSuperAdmin = roleQuery.data?.role === "super_admin";
  const pending = useQuery({
    queryKey: ["admin", "pending-changes", "dashboard"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase.from("pending_changes" as any) as any)
        .select("id, summary, submitted_by, submitted_email, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((d: { submitted_by: string }) => d.submitted_by))] as string[];
      const { data: people } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] };
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
      return (data ?? []).map((d: { submitted_by: string }) => ({
        ...d,
        submitted_name: names.get(d.submitted_by) || null,
      })) as {
        id: string;
        summary: string | null;
        submitted_email: string | null;
  submitted_name?: string | null;
        created_at: string;
      }[];
    },
  });
  const visibleLogs = (logs.data ?? []).filter(
    (log) => isSuperAdmin || (session && log.user_id === session.user.id),
  );

  const ann = announcements.data ?? [];
  const evt = events.data ?? [];
  const doc = documents.data ?? [];
  const off = officers.data ?? [];

  const currentYear = off
    .map((o) => o.academic_year)
    .filter((y): y is string => !!y)
    .sort()
    .reverse()[0] ?? null;
  const currentOfficers = currentYear
    ? off.filter((o) => o.is_active && o.academic_year === currentYear)
    : off.filter((o) => o.is_active);

  const cards = [
    {
      label: "Announcements",
      value: ann.length,
      hint: `${ann.filter((a) => a.status === "published").length} published`,
      icon: Megaphone,
      to: "/admin/announcements" as const,
    },
    {
      label: "Upcoming events",
      value: evt.filter((e) => e.event_status === "upcoming").length,
      hint: `${evt.length} total`,
      icon: CalendarDays,
      to: "/admin/events" as const,
    },
    {
      label: "Published documents",
      value: doc.filter((d) => d.status === "published").length,
      hint: `${doc.length} total`,
      icon: FileText,
      to: "/admin/transparency" as const,
    },
    {
      label: "Current officers",
      value: currentOfficers.length,
      hint: currentYear
        ? `${currentYear} · ${off.length} records in all years`
        : `${off.length} records`,
      icon: Users,
      to: "/admin/officers" as const,
    },
    {
      label: "Pending drafts",
      value:
        ann.filter((a) => a.status === "draft").length +
        evt.filter((e) => e.status === "draft").length +
        doc.filter((d) => d.status === "draft").length,
      hint: "Across all content",
      icon: FilePen,
      to: "/admin/announcements" as const,
    },
    {
      label: "Unread messages",
      value: (messages.data ?? []).filter((m) => !m.is_read).length,
      hint: `${(messages.data ?? []).length} received`,
      icon: Mail,
      to: "/admin/messages" as const,
    },
  ];

  const bmap = birthdates.data ?? new Map<string, string>();
  const withBd = currentOfficers
    .map((o) => ({ o, bd: bmap.get(o.id) }))
    .filter((r): r is { o: (typeof off)[number]; bd: string } => !!r.bd);
  void manilaDay;
  const birthdaysToday = withBd.filter((r) => isBirthdayToday(r.bd));
  const birthdaysSoon = withBd
    .map((r) => ({ ...r, days: daysUntil(r.bd) }))
    .filter((r) => r.days > 0 && r.days <= 2)
    .sort((a, b) => a.days - b.days || a.o.name.localeCompare(b.o.name));
  const soonLabel = (days: number) => (days === 1 ? "tomorrow" : `in ${days} days`);


  return (
    <AdminShell title="Dashboard" description="Overview of organization content and activity">
      {birthdaysToday.length || birthdaysSoon.length ? (
        <Link
          to="/admin/officers"
          className="mb-4 block rounded-2xl border border-primary/30 bg-primary-subtle p-4 text-sm"
        >
          {birthdaysToday.length ? (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <Cake className="size-4 text-primary" aria-hidden="true" />
                {birthdaysToday.length === 1
                  ? "1 officer has a birthday today."
                  : `${birthdaysToday.length} officers have birthdays today.`}
              </p>
              <ul className="mt-2 space-y-0.5">
                {birthdaysToday.map((r) => (
                  <li key={r.o.id}>• {r.o.name} — {r.o.position} · {r.o.academic_year ?? "No school year"}</li>
                ))}
              </ul>
            </>
          ) : null}
          {birthdaysSoon.length ? (
            <>
              <p className={`flex items-center gap-2 font-semibold${birthdaysToday.length ? " mt-3" : ""}`}>
                <Gift className="size-4 text-primary" aria-hidden="true" />
                {birthdaysSoon.length === 1
                  ? "1 birthday is coming up"
                  : `${birthdaysSoon.length} birthdays are coming up`}
              </p>
              <ul className="mt-2 space-y-0.5">
                {birthdaysSoon.map((r) => (
                  <li key={r.o.id}>
                    • {r.o.name} — {r.o.position} · {r.o.academic_year ?? "No school year"} ·{" "}
                    {soonLabel(r.days)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Link>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="rounded-2xl game-panel p-5 shadow-card transition-shadow hover:shadow-lift"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
              <card.icon className="size-4 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </Link>
        ))}
      </div>

      {isSuperAdmin ? (
      <section className="mt-8 rounded-2xl game-panel p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">
            Pending approval{" "}
            <span className="text-muted-foreground">({(pending.data ?? []).length})</span>
          </h2>
          {isSuperAdmin ? (
            <Link to="/admin/approvals" className="text-sm text-primary-deep hover:underline">
              Review changes
            </Link>
          ) : null}
        </div>
        <ul className="mt-4 divide-y divide-border text-sm">
          {(pending.data ?? []).slice(0, 5).map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span>
                <span className="font-medium">{item.summary}</span>{" "}
                <span className="text-muted-foreground">
                  · {item.submitted_name ? `${item.submitted_name} (${item.submitted_email ?? "no email"})` : (item.submitted_email ?? "Administrator")}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
            </li>
          ))}
          {!(pending.data ?? []).length ? (
            <li className="py-6 text-center text-muted-foreground">Nothing is waiting for approval.</li>
          ) : null}
        </ul>
      </section>
      ) : null}


      <section className="mt-8 rounded-2xl game-panel p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Recent activity</h2>
          <Link to="/admin/audit-logs" className="text-sm text-primary-deep hover:underline">
            View audit logs
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border text-sm">
          {visibleLogs.slice(0, 8).map((log) => (
            <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span>
                <span className="font-medium">{log.user_email ?? "Administrator"}</span>{" "}
                <span className="text-muted-foreground">
                  {log.action} {log.entity_type}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(log.created_at)} · {new Date(log.created_at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</span>
            </li>
          ))}
          {!visibleLogs.length ? (
            <li className="py-6 text-center text-muted-foreground">No activity recorded yet.</li>
          ) : null}
        </ul>
      </section>
    </AdminShell>
  );
}
