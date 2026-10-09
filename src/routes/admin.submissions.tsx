import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ScheduleIndicator } from "@/lib/schedule";
import { logAction } from "@/hooks/use-csc-auth";
import { entityLabel } from "@/lib/change-requests";
import {
  ChangeHistory,
  ChangeStatusBadge,
  PayloadEditor,
  SECTION,
  formatDateTime,
  type ChangeStatus,
  type PendingChange,
} from "@/components/admin/change-review";

export const Route = createFileRoute("/admin/submissions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Submissions — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: my submissions." },
      { property: "og:title", content: "My Submissions — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: my submissions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubmissionsPage,
});

const FILTERS: Array<{ value: ChangeStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "revision_requested", label: "Revision Requested" },
  { value: "pending", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function titleOf(item: PendingChange) {
  const p = item.payload ?? {};
  return String(p["title"] ?? p["organization_name"] ?? item.summary ?? "Untitled");
}

function SubmissionsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ChangeStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<PendingChange | null>(null);

  const query = useQuery({
    queryKey: ["admin", "my-submissions"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await (supabase.from("pending_changes" as any) as any)
        .select("*")
        .eq("submitted_by", u.user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const reviewers = [...new Set((data ?? []).map((d: { reviewed_by: string | null }) => d.reviewed_by).filter(Boolean))] as string[];
      const { data: people } = reviewers.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", reviewers)
        : { data: [] };
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email]));
      return (data ?? []).map((d: { reviewed_by: string | null }) => ({
        ...d,
        reviewer_name: d.reviewed_by ? names.get(d.reviewed_by) ?? "Super Admin" : null,
      })) as Array<PendingChange & { reviewer_name: string | null }>;
    },
  });

  const all = query.data ?? [];
  const items = filter === "all" ? all : all.filter((i) => i.status === filter);
  const revisions = all.filter((i) => i.status === "revision_requested").length;

  return (
    <AdminShell title="My submissions" description="Track the status of changes you sent for approval">
      {revisions ? (
        <p className="mb-4 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm">
          {revisions} submission{revisions > 1 ? "s need" : " needs"} your revision.
        </p>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"} onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>
      <div className="space-y-4">
        {query.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length ? (
          items.map((item) => {
            const open = expanded === item.id || item.status === "revision_requested";
            return (
              <section key={item.id} className="rounded-2xl game-panel p-5 shadow-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{SECTION[item.table_name]}</Badge>
                      <Badge>{item.action}</Badge>
                      <ChangeStatusBadge status={item.status} />
                      {item.payload?.["status"] === "scheduled" ? <Badge variant="outline">Publishing: {item.status === "approved" ? "Scheduled" : "Unpublished"}</Badge> : null}
                    </div>
                    <p className="mt-2 break-words font-medium">{titleOf(item)}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDateTime(item.created_at)} · Updated {formatDateTime(item.updated_at)}
                    </p>
                    {item.payload?.["status"] === "scheduled" ? (
                      <div className="mt-2">
                        <ScheduleIndicator at={item.payload["scheduled_at"] as string | null} approval={item.status} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status !== "revision_requested" ? (
                      <Button variant="ghost" size="sm" onClick={() => setExpanded(open ? null : item.id)}>
                        <Eye className="mr-1 size-4" /> {open ? "Hide" : "View"}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setEditing(item)}>
                        <Pencil className="mr-1 size-4" /> Edit post
                      </Button>
                    )}
                  </div>
                </div>
                {(item.status === "revision_requested" || item.status === "rejected") && item.reviewed_at ? (
                  <div
                    className={`mt-4 rounded-xl border p-4 text-sm ${
                      item.status === "rejected" ? "border-destructive/40 bg-destructive/10" : "border-primary/40 bg-primary/10"
                    }`}
                  >
                    <p className="font-semibold">
                      {item.status === "rejected" ? "Rejected" : "Revision requested"} by {item.reviewer_name ?? "Super Admin"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.reviewed_at)}</p>
                    <p className="mt-2 whitespace-pre-line">{item.review_message ?? "No message was given."}</p>
                  </div>
                ) : null}
                {open ? (
                  <div className="mt-4">
                    <h3 className="mb-2 text-sm font-semibold">Approval history</h3>
                    <ChangeHistory changeId={item.id} />
                  </div>
                ) : null}
              </section>
            );
          })
        ) : (
          <p className="rounded-2xl game-panel p-6 text-sm text-muted-foreground shadow-card">No submissions here.</p>
        )}
      </div>

      <PayloadEditor
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing ? `Revise: ${titleOf(editing)}` : "Revise"}
        initial={editing?.payload ?? {}}
        submitLabel="Resubmit for Approval"
        onSubmit={async (payload) => {
          if (!editing) return;
          const { error } = await (supabase.rpc as any)("edit_change", {
            _id: editing.id,
            _payload: payload,
            _resubmit: true,
          });
          if (error) return void toast.error(error.message);
          await logAction("resubmit", entityLabel(editing.table_name), editing.record_id, { summary: editing.summary });
          toast.success("Post resubmitted successfully.");
          setEditing(null);
          void queryClient.invalidateQueries();
        }}
      />
    </AdminShell>
  );
}
