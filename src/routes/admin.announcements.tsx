import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { submitChange, PENDING_MESSAGE } from "@/lib/change-requests";
import { Plus, Pencil, Trash2, Star, Eye, EyeOff } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmAction, FileUploader, RichTextEditor, StatusBadge, TippedButton } from "@/components/admin/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allAnnouncementsQuery } from "@/lib/queries";
import { ANNOUNCEMENT_CATEGORIES, formatDate, slugify } from "@/lib/csc-types";
import type { Announcement } from "@/lib/csc-types";
import { logAction, useAdminRole, useSession } from "@/hooks/use-csc-auth";
import { ScheduleFields, ScheduleIndicator, blankSchedule, resolvePublish, scheduleFromRow, type ScheduleState } from "@/lib/schedule";

export const Route = createFileRoute("/admin/announcements")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Announcements — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: announcements." },
      { property: "og:title", content: "Announcements — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: announcements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAnnouncements,
});

type FormState = {
  id?: string;
  title: string;
  content: string;
  category: string;
  featured_image: string;
  author_name: string;
  is_featured: boolean;
  status: string;
  published_at: string;
};

const blank: FormState = {
  title: "",
  content: "",
  category: "General",
  featured_image: "",
  author_name: "",
  is_featured: false,
  status: "draft",
  published_at: new Date().toISOString().slice(0, 10),
};

function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const roleQuery = useAdminRole(session?.user.id);
  const isSuper = roleQuery.data?.role === "super_admin";
  const { data, isPending } = useQuery(allAnnouncementsQuery);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [schedule, setSchedule] = useState<ScheduleState>(blankSchedule);
  const [saving, setSaving] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    void queryClient.invalidateQueries({ queryKey: ["announcements"] });
  }

  function startCreate() {
    setSchedule(blankSchedule);
    setForm({
      ...blank,
      author_name: roleQuery.data?.fullName ?? session?.user.email ?? "",
    });
    setOpen(true);
  }

  function startEdit(item: Announcement) {
    setSchedule(scheduleFromRow(item.status, item.scheduled_at));
    setForm({
      id: item.id,
      title: item.title,
      content: item.content ?? "",
      category: item.category,
      featured_image: item.featured_image ?? "",
      author_name: item.author_name ?? "",
      is_featured: item.is_featured,
      status: item.status,
      published_at: (item.published_at ?? new Date().toISOString()).slice(0, 10),
    });
    setOpen(true);
  }

  async function save(status: "draft" | "published") {
    const resolved = resolvePublish(status, schedule);
    if ("error" in resolved) {
      toast.error(resolved.error);
      return;
    }
    if (form.title.trim().length < 3) {
      toast.error("Please enter a title.");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      ...(form.id ? {} : { slug: slugify(form.title) }),
      content: form.content,
      category: form.category,
      featured_image: form.featured_image || null,
      author_name: form.author_name.trim() || null,
      is_featured: form.is_featured,
      status: resolved.status,
      scheduled_at: resolved.scheduled_at,
      published_at:
        status === "published"
          ? new Date(form.published_at).toISOString()
          : null,
    };

    const { error, pending } = await submitChange(
      "announcements",
      form.id ? "update" : "create",
      form.id ?? null,
      payload,
      `${resolved.status === "scheduled" ? "Schedule" : status === "published" ? "Publish" : "Save draft"} announcement: ${payload.title}`,
    );
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (pending) {
      toast.success(PENDING_MESSAGE);
      setOpen(false);
      return;
    }
    await logAction(form.id ? "update" : "create", "announcement", form.id ?? null, {
      title: payload.title,
    });
    toast.success(form.id ? "Announcement updated." : "Announcement created.");
    setOpen(false);
    refresh();
  }

  async function toggleStatus(item: Announcement) {
    const next = item.status === "published" ? "draft" : "published";
    const { error, pending } = await submitChange(
      "announcements",
      "update",
      item.id,
      {
        status: next,
        published_at: next === "published" ? (item.published_at ?? new Date().toISOString()) : null,
      },
      `${next === "published" ? "Publish" : "Unpublish"} announcement: ${item.title}`,
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    if (pending) {
      toast.success(PENDING_MESSAGE);
      return;
    }
    await logAction(next === "published" ? "publish" : "unpublish", "announcement", item.id);
    toast.success(next === "published" ? "Announcement published." : "Announcement unpublished.");
    refresh();
  }

  async function toggleFeatured(item: Announcement) {
    const { error, pending } = await submitChange(
      "announcements",
      "update",
      item.id,
      { is_featured: !item.is_featured },
      `${item.is_featured ? "Unfeature" : "Feature"} announcement: ${item.title}`,
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    if (pending) {
      toast.success(PENDING_MESSAGE);
      return;
    }
    await logAction("update", "announcement", item.id, { is_featured: !item.is_featured });
    refresh();
  }

  async function remove(item: Announcement) {
    const { error, pending } = await submitChange("announcements", "delete", item.id, {}, `Delete announcement: ${item.title}`);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (pending) {
      toast.success(PENDING_MESSAGE);
      return;
    }
    await logAction("delete", "announcement", item.id, { title: item.title });
    toast.success("Announcement deleted.");
    refresh();
  }

  return (
    <AdminShell
      title="Announcements"
      description="Create, publish, and feature official updates"
      actions={
        <Button onClick={startCreate}>
          <Plus className="mr-1 size-4" /> New announcement
        </Button>
      }
    >
      <div className="overflow-hidden rounded-2xl game-panel shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : (data ?? []).length ? (
              (data ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{item.title}</span>
                    {item.is_featured ? (
                      <Star className="ml-2 inline size-3.5 fill-primary text-primary" />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                    {item.status === "scheduled" ? (
                      <ScheduleIndicator compact at={item.scheduled_at} approval="approved" />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(item.published_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <TippedButton
                        variant="ghost"
                        size="icon"
                        label="Toggle featured"
                        onClick={() => void toggleFeatured(item)}
                      >
                        <Star className="size-4" />
                      </TippedButton>
                      <TippedButton
                        variant="ghost"
                        size="icon"
                        label={item.status === "published" ? "Unpublish" : "Publish"}
                        onClick={() => void toggleStatus(item)}
                      >
                        {item.status === "published" ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </TippedButton>
                      <TippedButton
                        variant="ghost"
                        size="icon"
                        label="Edit"
                        onClick={() => startEdit(item)}
                      >
                        <Pencil className="size-4" />
                      </TippedButton>
                      <ConfirmAction
                        title="Delete this announcement?"
                        description="This permanently removes the announcement from the website."
                        tipLabel="Delete"
                        onConfirm={() => remove(item)}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Delete">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No announcements yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit announcement" : "New announcement"}</DialogTitle>
            <DialogDescription>
              Drafts stay private until you publish them.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger id="category" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={form.author_name}
                readOnly
                disabled
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="date">Publication date</Label>
              <Input
                id="date"
                type="date"
                value={form.published_at}
                onChange={(event) => setForm({ ...form, published_at: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Featured image</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <FileUploader
                  kind="media"
                  label="Upload image"
                  accept="image/*"
                  onUploaded={(result) => setForm({ ...form, featured_image: result.url })}
                />
                {form.featured_image ? (
                  <>
                    <img
                      src={form.featured_image}
                      alt="Preview"
                      className="h-14 w-24 rounded-lg border border-border object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, featured_image: "" })}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">No image selected</span>
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Content</Label>
              <div className="mt-1.5">
                <RichTextEditor
                  key={form.id ?? "new"}
                  value={form.content}
                  onChange={(next) => setForm({ ...form, content: next })}
                />
              </div>
            </div>
            <div className="flex items-center gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) => setForm({ ...form, is_featured: event.target.checked })}
                />
                Feature on the homepage
              </label>
            </div>
          </div>

          <div className="grid">
            {form.status !== "published" ? <ScheduleFields value={schedule} onChange={setSchedule} /> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => void save("draft")} disabled={saving}>
              {saving ? "Saving…" : "Save as Draft"}
            </Button>
            <Button onClick={() => void save("published")} disabled={saving}>
              {saving ? "Saving…" : isSuper ? (schedule.enabled ? "Schedule" : "Publish") : "Send for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
