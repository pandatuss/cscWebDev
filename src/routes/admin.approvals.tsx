import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Eye, Pencil, Undo2, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { applyChange, entityLabel } from "@/lib/change-requests";
import { ScheduleIndicator } from "@/lib/schedule";
import { logAction } from "@/hooks/use-csc-auth";
import { approveSuperAdminDemotion } from "@/lib/admin.functions";
import { ConfirmAction } from "@/components/admin/controls";
import {
  ChangeHistory,
  ChangeStatusBadge,
  MessageDialog,
  PayloadEditor,
  SECTION,
  formatDateTime,
  type PendingChange,
} from "@/components/admin/change-review";

export const Route = createFileRoute("/admin/approvals")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pending Approval — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: pending approval." },
      { property: "og:title", content: "Pending Approval — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: pending approval." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApprovalsPage,
});

const HIDDEN = new Set(["file_url", "photo_url", "featured_image", "image_url"]);

function preview(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value.length > 160 ? `${value.slice(0, 160)}…` : value;
  return JSON.stringify(value).slice(0, 160);
}

function titleOf(item: PendingChange) {
  const p = item.payload ?? {};
  return String(p["title"] ?? p["organization_name"] ?? item.summary ?? "Untitled");
}

function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<PendingChange | null>(null);
  const [sendBack, setSendBack] = useState<PendingChange | null>(null);
  const [rejecting, setRejecting] = useState<PendingChange | null>(null);

  const query = useQuery({
    queryKey: ["admin", "pending-changes"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("pending_changes" as any) as any)
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((d: { submitted_by: string }) => d.submitted_by))] as string[];
      const { data: people } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] };
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
      return (data ?? []).map((d: { submitted_by: string }) => ({
        ...d,
        submitted_name: names.get(d.submitted_by) || null,
      })) as PendingChange[];
    },
  });

  async function decide(item: PendingChange, decision: "approved" | "rejected" | "revision_requested", message?: string) {
    setBusy(item.id);
    try {
      if (item.table_name === "user_roles" && decision === "approved") {
        try {
          await approveSuperAdminDemotion({ data: { changeId: item.id } });
          toast.success("Demotion approved.");
          void queryClient.invalidateQueries();
        } catch (caught) {
          toast.error(caught instanceof Error ? caught.message : "Could not approve.");
        }
        return;
      }
      if (decision === "approved") {
        const { error } = await applyChange(item.table_name, item.action, item.record_id, item.payload);
        if (error) return void toast.error(error.message);
      }
      const { error } = await (supabase.rpc as any)("review_change", {
        _id: item.id,
        _decision: decision,
        _message: message ?? null,
      });
      if (error) return void toast.error(error.message);
      await logAction(decision === "approved" ? "approve" : decision === "rejected" ? "reject" : "request revision", "change", item.id, {
        summary: item.summary,
        by: item.submitted_email,
        message,
      });
      if (decision === "approved") {
        await logAction(item.action, entityLabel(item.table_name), item.record_id, {
          summary: item.summary,
          requested_by: item.submitted_email,
        });
      }
      toast.success(
        decision === "approved"
          ? item.payload?.["status"] === "scheduled"
            ? "This post has been approved and will automatically be published at the scheduled time."
            : "Post approved successfully."
          : decision === "rejected"
            ? "Post rejected."
            : "Post sent back for revision.",
      );
      setSendBack(null);
      setRejecting(null);
      void queryClient.invalidateQueries();
    } finally {
      setBusy(null);
    }
  }

  const items = query.data ?? [];

  return (
    <AdminShell
      title="Pending approval"
      description="Review, edit, approve, reject or send back changes from administrators"
      requireSuperAdmin
    >
      <div className="space-y-4">
        {query.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length ? (
          items.map((item) => {
            const fields = Object.entries(item.payload ?? {}).filter(([k]) => !HIDDEN.has(k));
            const open = expanded === item.id;
            return (
              <section key={item.id} className="rounded-2xl game-panel p-5 shadow-card">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{SECTION[item.table_name]}</Badge>
                      <Badge
                        className={
                          item.action === "delete"
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive"
                            : undefined
                        }
                      >
                        {item.action === "create" ? "Create" : item.action}
                      </Badge>
                      <ChangeStatusBadge status={item.status} />
                      {item.payload?.["status"] === "scheduled" ? <Badge variant="outline">Publishing: {item.status === "approved" ? "Scheduled" : "Unpublished"}</Badge> : null}
                    </div>
                    <p className="mt-2 break-words font-medium">{titleOf(item)}</p>
                    {item.summary && item.summary !== titleOf(item) ? (
                      <p className="text-sm text-muted-foreground">{item.summary}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {item.submitted_name
                        ? `${item.submitted_name} (${item.submitted_email ?? "no email"})`
                        : (item.submitted_email ?? "Administrator")}{" "}
                      · Submitted {formatDateTime(item.created_at)} · Updated {formatDateTime(item.updated_at)}
                    </p>
                    {item.payload?.["status"] === "scheduled" ? (
                      <div className="mt-2">
                        <ScheduleIndicator at={item.payload["scheduled_at"] as string | null} approval={item.status} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(open ? null : item.id)}>
                      <Eye className="mr-1 size-4" /> {open ? "Hide" : "View"}
                    </Button>
                    {item.action !== "delete" ? (
                      <Button variant="outline" size="sm" disabled={busy === item.id} onClick={() => setEditing(item)}>
                        <Pencil className="mr-1 size-4" /> Edit
                      </Button>
                    ) : null}
                    <ConfirmAction
                      trigger={
                        <Button size="sm" disabled={busy === item.id}>
                          <Check className="mr-1 size-4" /> Approve
                        </Button>
                      }
                      title="Approve this change?"
                      description={item.payload?.["status"] === "scheduled" ? "It will stay unpublished and publish automatically at its scheduled time." : "It will be saved and published according to its status."}
                      confirmLabel="Approve"
                      onConfirm={() => decide(item, "approved")}
                    />
                    <Button variant="outline" size="sm" disabled={busy === item.id} onClick={() => setSendBack(item)}>
                      <Undo2 className="mr-1 size-4" /> Send back
                    </Button>
                    <Button variant="destructive" size="sm" disabled={busy === item.id} onClick={() => setRejecting(item)}>
                      <X className="mr-1 size-4" /> Reject
                    </Button>
                  </div>
                </div>
                {open ? (
                  <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem]">
                    {fields.length ? (
                      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
                        {fields.map(([key, value]) => (
                          <div key={key} className="contents">
                            <dt className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</dt>
                            <dd className="whitespace-pre-line break-words">{preview(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-sm text-muted-foreground">No fields.</p>
                    )}
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Approval history</h3>
                      <ChangeHistory changeId={item.id} />
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })
        ) : (
          <p className="rounded-2xl game-panel p-6 text-sm text-muted-foreground shadow-card">
            Nothing is waiting for approval.
          </p>
        )}
      </div>

      <PayloadEditor
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing ? `Edit: ${titleOf(editing)}` : "Edit"}
        initial={editing?.payload ?? {}}
        submitLabel="Save changes"
        onSubmit={async (payload) => {
          if (!editing) return;
          const { error } = await (supabase.rpc as any)("edit_change", { _id: editing.id, _payload: payload });
          if (error) return void toast.error(error.message);
          toast.success("Changes saved. The post is still pending your decision.");
          setEditing(null);
          void queryClient.invalidateQueries();
        }}
      />
      <MessageDialog
        open={!!sendBack}
        onOpenChange={(o) => !o && setSendBack(null)}
        title="Request Revision"
        description="Please provide a message explaining what the administrator needs to change."
        placeholder="Please update the featured image and revise the second paragraph before resubmitting."
        required
        confirmLabel="Send Back for Revision"
        onConfirm={async (m) => { if (sendBack) await decide(sendBack, "revision_requested", m); }}
      />
      <MessageDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title="Reject this post?"
        description="The administrator will see that it was rejected, along with your reason."
        placeholder="This post does not meet the current content requirements."
        confirmLabel="Reject"
        destructive
        onConfirm={async (m) => { if (rejecting) await decide(rejecting, "rejected", m); }}
      />
    </AdminShell>
  );
}
