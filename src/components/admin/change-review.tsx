import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { RichTextEditor } from "@/components/admin/controls";
import { isoToManila, manilaToIso, TIMEZONE } from "@/lib/schedule";
import type { ChangeAction, ChangeTable } from "@/lib/change-requests";

export type ChangeStatus = "pending" | "revision_requested" | "approved" | "rejected";

export type PendingChange = {
  id: string;
  table_name: ChangeTable;
  action: ChangeAction;
  record_id: string | null;
  payload: Record<string, unknown>;
  summary: string | null;
  status: ChangeStatus;
  review_message: string | null;
  reviewed_at: string | null;
  submitted_by: string;
  submitted_email: string | null;
  submitted_name?: string | null;
  created_at: string;
  updated_at: string;
};

export const SECTION: Record<ChangeTable, string> = {
  announcements: "Announcements",
  events: "Events",
  transparency_documents: "Transparency",
  organization_settings: "Page content / Org info",
  user_roles: "Administrator role",
};

const STATUS: Record<ChangeStatus, { label: string; className: string }> = {
  pending: { label: "Pending Approval", className: "bg-accent text-accent-foreground hover:bg-accent" },
  revision_requested: {
    label: "Revision Requested",
    className: "bg-primary text-primary-foreground hover:bg-primary",
  },
  approved: { label: "Approved", className: "bg-success text-success-foreground hover:bg-success" },
  rejected: {
    label: "Rejected",
    className: "bg-destructive text-destructive-foreground hover:bg-destructive",
  },
};

export function ChangeStatusBadge({ status }: { status: ChangeStatus }) {
  const s = STATUS[status] ?? STATUS.pending;
  return <Badge className={s.className}>{s.label}</Badge>;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const ACTION_LABEL: Record<string, string> = {
  submitted: "Submitted for approval",
  edited: "Edited",
  revision_requested: "Requested revision",
  resubmitted: "Resubmitted for approval",
  approved: "Approved",
  rejected: "Rejected",
  scheduled: "📅 Scheduled post",
  schedule_updated: "Changed scheduled time",
  published: "✓ Post automatically published",
};

type HistoryRow = {
  id: string;
  action: string;
  performed_by_name: string | null;
  performed_by_role: string | null;
  message: string | null;
  created_at: string;
};

export function ChangeHistory({ changeId }: { changeId: string }) {
  const query = useQuery({
    queryKey: ["change-history", changeId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("change_history" as any) as any)
        .select("*")
        .eq("change_id", changeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HistoryRow[];
    },
  });
  if (query.isPending) return <p className="text-xs text-muted-foreground">Loading history…</p>;
  if (!query.data?.length) return <p className="text-xs text-muted-foreground">No history yet.</p>;
  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {query.data.map((h) => (
        <li key={h.id} className="text-sm">
          <p className="text-xs text-muted-foreground">
            {formatDateTime(h.created_at)} — {h.performed_by_name ?? "Unknown"} ({h.performed_by_role ?? "Admin"})
          </p>
          <p className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</p>
          {h.message ? <p className="mt-1 whitespace-pre-line rounded-md bg-secondary/60 p-2">“{h.message}”</p> : null}
        </li>
      ))}
    </ol>
  );
}

const SKIP = new Set(["id", "created_at", "updated_at", "published_at"]);
const LONG = new Set(["content", "description", "about_text", "mission", "vision", "biography"]);

export function PayloadEditor({
  open,
  onOpenChange,
  title,
  initial,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial: Record<string, unknown>;
  submitLabel: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Change the fields below, then save.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {Object.entries(draft)
            .filter(([k]) => !SKIP.has(k))
            .map(([key, value]) => {
              const id = `field-${key}`;
              const label = key.replace(/_/g, " ");
              if (typeof value === "boolean") {
                return (
                  <label key={key} className="flex items-center gap-2 text-sm capitalize">
                    <input type="checkbox" checked={value} onChange={(e) => set(key, e.target.checked)} />
                    {label}
                  </label>
                );
              }
              if (value !== null && typeof value === "object") {
                return (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={id} className="capitalize">{label}</Label>
                    <Textarea
                      id={id}
                      rows={4}
                      className="font-mono text-xs"
                      defaultValue={JSON.stringify(value, null, 2)}
                      onBlur={(e) => {
                        try {
                          set(key, JSON.parse(e.target.value));
                        } catch {
                        }
                      }}
                    />
                  </div>
                );
              }
              if (key === "scheduled_at") {
                if (draft["status"] !== "scheduled") return null;
                const cur = isoToManila(value as string | null);
                return (
                  <div key={key} className="space-y-1">
                    <Label>Scheduled date &amp; time ({TIMEZONE})</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={cur.date} onChange={(e) => set(key, manilaToIso(e.target.value, cur.time || "08:00"))} />
                      <Input type="time" value={cur.time} onChange={(e) => set(key, manilaToIso(cur.date, e.target.value))} />
                    </div>
                  </div>
                );
              }
              if (key === "content") {
                return (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize">{label}</Label>
                    <RichTextEditor id={id} value={String(value ?? "")} onChange={(v) => set(key, v)} />
                  </div>
                );
              }
              return (
                <div key={key} className="space-y-1">
                  <Label htmlFor={id} className="capitalize">{label}</Label>
                  {LONG.has(key) ? (
                    <Textarea id={id} rows={5} value={String(value ?? "")} onChange={(e) => set(key, e.target.value)} />
                  ) : (
                    <Input
                      id={id}
                      type={typeof value === "number" ? "number" : "text"}
                      value={value === null || value === undefined ? "" : String(value)}
                      onChange={(e) =>
                        set(
                          key,
                          typeof value === "number"
                            ? Number(e.target.value)
                            : e.target.value === "" && value === null
                              ? null
                              : e.target.value,
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(draft);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MessageDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  required,
  confirmLabel,
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder: string;
  required?: boolean;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (message: string) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setMessage("");
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="review-message">Message / Feedback{required ? " *" : " (optional)"}</Label>
          <Textarea
            id="review-message"
            rows={5}
            value={message}
            placeholder={placeholder}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy || (required && !message.trim())}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(message.trim());
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
