import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, MoreHorizontal, Reply, Search, Trash2, ShieldAlert, Inbox } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/hooks/use-csc-auth";

export const Route = createFileRoute("/admin/messages")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Contact Messages — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: contact messages." },
      { property: "og:title", content: "Contact Messages — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: contact messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminMessages,
});

type Msg = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  status: string;
  is_spam: boolean;
  spam_score: number;
  spam_reason: string | null;
  spam_source: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type Tab = "all" | "unread" | "read" | "ongoing" | "resolved" | "spam";
type Sort = "newest" | "oldest" | "unread" | "updated";
type Patch = Partial<Pick<Msg, "is_read" | "status" | "is_spam" | "spam_source">> & { deleted_at?: string };

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
  { key: "ongoing", label: "Ongoing" },
  { key: "resolved", label: "Resolved" },
  { key: "spam", label: "Spam" },
];

const EMPTY: Record<Tab, [string, string]> = {
  all: ["No messages yet", "Messages from the contact form will appear here."],
  unread: ["No unread messages", "You're all caught up."],
  read: ["No read messages", ""],
  ongoing: ["No ongoing messages", ""],
  resolved: ["No resolved messages", ""],
  spam: ["No spam messages", ""],
};

const table = () => supabase.from("contact_messages") as any;

function applyTab(q: any, tab: Tab) {
  q = q.is("deleted_at", null);
  if (tab === "spam") return q.eq("is_spam", true);
  q = q.eq("is_spam", false);
  if (tab === "unread") return q.eq("is_read", false);
  if (tab === "read") return q.eq("is_read", true);
  if (tab === "ongoing") return q.eq("status", "ongoing");
  if (tab === "resolved") return q.eq("status", "resolved");
  return q;
}

function gmailUrl(m: Msg) {
  const subject = `Re: ${m.subject?.trim() || "Your message"}`;
  const quoted = `\n\n\n--- On ${new Date(m.created_at).toLocaleString("en-PH")}, ${m.name} wrote: ---\n${m.message.slice(0, 1500)}`;
  const p = new URLSearchParams({ view: "cm", fs: "1", to: m.email, su: subject, body: quoted });
  return `https://mail.google.com/mail/?${p.toString()}`;
}

function respond(m: Msg) {
  const w = window.open(gmailUrl(m), "_blank", "noopener,noreferrer");
  if (!w) {
    const subject = encodeURIComponent(`Re: ${m.subject?.trim() || "Your message"}`);
    toast.info("Gmail popup was blocked — opening your default email app instead.");
    window.location.href = `mailto:${encodeURIComponent(m.email)}?subject=${subject}`;
  }
}

function fmt(v: string) {
  return new Date(v).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function StatusPill({ m }: { m: Msg }) {
  if (m.is_spam) return <Badge variant="destructive">Spam</Badge>;
  if (m.status === "ongoing") return <Badge className="bg-primary text-primary-foreground hover:bg-primary">Ongoing</Badge>;
  if (m.status === "resolved") return <Badge className="bg-success text-success-foreground hover:bg-success">Resolved</Badge>;
  return <Badge variant="secondary">New</Badge>;
}

function AdminMessages() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim().slice(0, 100)), 350);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => setSelected(new Set()), [tab, search]);

  const list = useQuery({
    queryKey: ["admin", "messages", tab, sort, search],
    queryFn: async () => {
      let q = applyTab(table().select("*"), tab);
      if (search) {
        const s = search.replace(/[%_,()\\*."':]/g, " ");
        q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,subject.ilike.%${s}%,message.ilike.%${s}%`);
      }
      if (sort === "oldest") q = q.order("created_at", { ascending: true });
      else if (sort === "updated") q = q.order("updated_at", { ascending: false });
      else if (sort === "unread") q = q.order("is_read", { ascending: true }).order("created_at", { ascending: false });
      else q = q.order("created_at", { ascending: false });
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  const counts = useQuery({
    queryKey: ["admin", "messages", "counts"],
    queryFn: async () => {
      const res = await Promise.all(
        TABS.map((t) => applyTab(table().select("id", { count: "exact", head: true }), t.key)),
      );
      const out = {} as Record<Tab, number>;
      res.forEach((r: any, i) => {
        if (r.error) throw r.error;
        out[TABS[i]!.key] = r.count ?? 0;
      });
      return out;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-contact-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => {
        void qc.invalidateQueries({ queryKey: ["admin", "messages"] });
        void qc.invalidateQueries({ queryKey: ["unread-messages"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const messages = list.data ?? [];
  const openMsg = useMemo(() => messages.find((m) => m.id === openId) ?? null, [messages, openId]);

  async function update(ids: string[], patch: Patch, label: string, quiet = false) {
    if (!ids.length || ids.some((id) => busy.has(id))) return;
    setBusy((b) => new Set([...b, ...ids]));
    const { error } = await table().update(patch).in("id", ids);
    setBusy((b) => {
      const n = new Set(b);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    if (error) {
      toast.error("Unable to update message. Please try again.");
      return;
    }
    if (!quiet) {
      toast.success(ids.length > 1 ? `${ids.length} messages: ${label}` : label);
      for (const id of ids) void logAction(label.toLowerCase(), "message", id).catch(() => {});
    }
    setSelected(new Set());
    void qc.invalidateQueries({ queryKey: ["admin", "messages"] });
    void qc.invalidateQueries({ queryKey: ["unread-messages"] });
  }

  const act = {
    read: (ids: string[]) => update(ids, { is_read: true }, "Marked as read"),
    unread: (ids: string[]) => update(ids, { is_read: false }, "Marked as unread"),
    ongoing: (ids: string[]) => update(ids, { status: "ongoing", is_spam: false, spam_source: null }, "Marked as ongoing"),
    resolved: (ids: string[]) => update(ids, { status: "resolved", is_spam: false, spam_source: null }, "Marked as resolved"),
    spam: (ids: string[]) => update(ids, { is_spam: true, spam_source: "admin" }, "Marked as spam"),
    notSpam: (ids: string[]) => update(ids, { is_spam: false, spam_source: null }, "Moved to inbox"),
    remove: async (ids: string[]) => {
      await update(ids, { deleted_at: new Date().toISOString() }, "Deleted");
      if (openId && ids.includes(openId)) setOpenId(null);
    },
  };

  function openMessage(m: Msg) {
    setOpenId(m.id);
    if (!m.is_read) void update([m.id], { is_read: true }, "read", true);
  }

  const c = counts.data;
  const stats: [string, number | undefined][] = [
    ["Total", c ? c.all + c.spam : undefined],
    ["Unread", c?.unread],
    ["Ongoing", c?.ongoing],
    ["Resolved", c?.resolved],
    ["Spam", c?.spam],
  ];
  const ids = [...selected];
  const allChecked = messages.length > 0 && messages.every((m) => selected.has(m.id));

  return (
    <AdminShell title="Contact messages" description="Manage, respond to, and resolve messages sent through the contact form.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl game-panel p-4 shadow-card">
            <p className="text-2xl font-semibold">{n ?? "–"}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-2xl game-panel p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search messages..."
              className="pl-9"
              aria-label="Search messages"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Sort messages">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="unread">Unread first</SelectItem>
              <SelectItem value="updated">Recently updated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="rounded-full bg-secondary px-1.5 text-xs text-secondary-foreground">{c?.[t.key] ?? "–"}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex min-h-9 flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={allChecked}
              onCheckedChange={(v) => setSelected(v ? new Set(messages.map((m) => m.id)) : new Set())}
              aria-label="Select all"
            />
            {ids.length ? `${ids.length} selected` : "Select all"}
          </label>
          {ids.length ? (
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={() => void act.read(ids)}>Mark as read</Button>
              <Button size="sm" variant="outline" onClick={() => void act.unread(ids)}>Mark as unread</Button>
              <Button size="sm" variant="outline" onClick={() => void act.ongoing(ids)}>Mark as ongoing</Button>
              <Button size="sm" variant="outline" onClick={() => void act.resolved(ids)}>Mark as resolved</Button>
              {tab === "spam" ? (
                <Button size="sm" variant="outline" onClick={() => void act.notSpam(ids)}>Not spam</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => void act.spam(ids)}>Mark as spam</Button>
              )}
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmDelete(ids)}>Delete</Button>
            </div>
          ) : null}
        </div>

        {list.isError ? (
          <p className="py-6 text-sm text-destructive">Unable to load messages. Please try again.</p>
        ) : list.isPending ? (
          <div className="mt-3 space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : !messages.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">{search ? "No messages found" : EMPTY[tab][0]}</p>
            <p className="text-sm text-muted-foreground">{search ? "Try a different search term or filter." : EMPTY[tab][1]}</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {messages.map((m) => {
              const isBusy = busy.has(m.id);
              return (
                <li
                  key={m.id}
                  className={`group flex gap-3 rounded-xl border border-border p-3 transition-colors sm:p-4 ${
                    m.is_read ? "bg-background" : "bg-primary-subtle/40"
                  } ${isBusy ? "opacity-60" : ""}`}
                >
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(m.id)}
                    onCheckedChange={(v) =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (v) n.add(m.id);
                        else n.delete(m.id);
                        return n;
                      })
                    }
                    aria-label={`Select message from ${m.name}`}
                  />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openMessage(m)}>
                    <div className="flex flex-wrap items-center gap-2">
                      {!m.is_read ? <span className="size-2 rounded-full bg-primary" aria-label="Unread" /> : null}
                      <span className={m.is_read ? "font-medium" : "font-bold"}>{m.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{m.email}</span>
                      <StatusPill m={m} />
                      {m.status === "new" && !m.is_spam && !m.is_read ? null : null}
                      {!m.is_read ? <span className="text-xs font-medium text-primary-deep">Unread</span> : null}
                    </div>
                    <p className={`mt-1 truncate text-sm ${m.is_read ? "" : "font-semibold"}`}>{m.subject || "(No subject)"}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{m.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fmt(m.created_at)}
                      {m.is_spam ? ` · ${m.spam_source === "admin" ? "Marked by admin" : "Detected automatically"}` : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
                    <Button size="sm" onClick={() => respond(m)} disabled={isBusy}>
                      <Reply className="size-4 sm:mr-1" /> <span className="hidden sm:inline">Respond</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hidden md:inline-flex"
                      disabled={isBusy}
                      onClick={() => void (m.is_read ? act.unread([m.id]) : act.read([m.id]))}
                    >
                      {m.is_read ? "Mark unread" : "Mark read"}
                    </Button>
                    <RowMenu m={m} disabled={isBusy} act={act} onRespond={() => respond(m)} onDelete={() => setConfirmDelete([m.id])} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Sheet open={!!openMsg} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {openMsg ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><Mail className="size-4" /> Contact message</SheetTitle>
                <SheetDescription>Received {fmt(openMsg.created_at)}</SheetDescription>
              </SheetHeader>
              <dl className="mt-4 grid grid-cols-[90px_1fr] gap-y-2 text-sm">
                <dt className="text-muted-foreground">Sender</dt><dd className="font-medium">{openMsg.name}</dd>
                <dt className="text-muted-foreground">Email</dt><dd className="break-all">{openMsg.email}</dd>
                <dt className="text-muted-foreground">Status</dt><dd><StatusPill m={openMsg} /></dd>
                <dt className="text-muted-foreground">Read</dt><dd>{openMsg.is_read ? "Read" : "Unread"}</dd>
                {openMsg.resolved_at ? (<><dt className="text-muted-foreground">Resolved</dt><dd>{fmt(openMsg.resolved_at)}</dd></>) : null}
              </dl>
              {openMsg.is_spam || openMsg.spam_score >= 40 ? (
                <div className="mt-4 flex gap-2 rounded-lg border border-border bg-secondary/50 p-3 text-xs">
                  <ShieldAlert className="size-4 shrink-0 text-destructive" />
                  <div>
                    <p className="font-medium">
                      {openMsg.is_spam ? (openMsg.spam_source === "admin" ? "Marked as spam by admin" : "Detected automatically as spam") : "Suspicious message"} · score {openMsg.spam_score}/100
                    </p>
                    {openMsg.spam_reason ? <p className="text-muted-foreground">{openMsg.spam_reason}</p> : null}
                  </div>
                </div>
              ) : null}
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Subject</p>
                <p className="mt-1 font-medium">{openMsg.subject || "(No subject)"}</p>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Message</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{openMsg.message}</p>
              </div>
              <div className="mt-6 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
                <Button className="sm:col-span-2" onClick={() => respond(openMsg)}><Reply className="mr-1 size-4" /> Respond</Button>
                <Button variant="outline" disabled={busy.has(openMsg.id)} onClick={() => void act.ongoing([openMsg.id])}>Mark as Ongoing</Button>
                <Button variant="outline" disabled={busy.has(openMsg.id)} onClick={() => void act.resolved([openMsg.id])}>Mark as Resolved</Button>
                {openMsg.is_spam ? (
                  <Button variant="outline" disabled={busy.has(openMsg.id)} onClick={() => void act.notSpam([openMsg.id])}>Not Spam</Button>
                ) : (
                  <Button variant="outline" disabled={busy.has(openMsg.id)} onClick={() => void act.spam([openMsg.id])}>Mark as Spam</Button>
                )}
                <Button variant="outline" disabled={busy.has(openMsg.id)} onClick={() => void act.unread([openMsg.id])}>Mark as unread</Button>
                <Button variant="outline" className="text-destructive sm:col-span-2" onClick={() => setConfirmDelete([openMsg.id])}>
                  <Trash2 className="mr-1 size-4" /> Delete
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete && confirmDelete.length > 1 ? `${confirmDelete.length} messages` : "this message"}?</AlertDialogTitle>
            <AlertDialogDescription>The message will be removed from the inbox.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = confirmDelete ?? [];
                setConfirmDelete(null);
                void act.remove(target);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function RowMenu({
  m,
  disabled,
  act,
  onRespond,
  onDelete,
}: {
  m: Msg;
  disabled: boolean;
  act: {
    read: (ids: string[]) => Promise<void>;
    unread: (ids: string[]) => Promise<void>;
    ongoing: (ids: string[]) => Promise<void>;
    resolved: (ids: string[]) => Promise<void>;
    spam: (ids: string[]) => Promise<void>;
    notSpam: (ids: string[]) => Promise<void>;
  };
  onRespond: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" disabled={disabled} aria-label="More actions" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRespond}>Respond</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void (m.is_read ? act.unread([m.id]) : act.read([m.id]))}>
          {m.is_read ? "Mark as unread" : "Mark as read"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void act.ongoing([m.id])}>Mark as ongoing</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void act.resolved([m.id])}>Mark as resolved</DropdownMenuItem>
        {m.is_spam ? (
          <DropdownMenuItem onClick={() => void act.notSpam([m.id])}>Not spam</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => void act.spam([m.id])}>Mark as spam</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
