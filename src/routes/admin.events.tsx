import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { submitChange, PENDING_MESSAGE } from "@/lib/change-requests";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmAction, FileUploader, StatusBadge, TippedButton } from "@/components/admin/controls";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allEventsQuery } from "@/lib/queries";
import { EVENT_STATUSES, formatDate, slugify } from "@/lib/csc-types";
import type { EventRow } from "@/lib/csc-types";
import { logAction, useAdminRole, useSession } from "@/hooks/use-csc-auth";
import { ScheduleFields, ScheduleIndicator, blankSchedule, resolvePublish, scheduleFromRow, type ScheduleState } from "@/lib/schedule";

export const Route = createFileRoute("/admin/events")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Events — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: events." },
      { property: "og:title", content: "Events — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminEvents,
});

type FormState = {
  id?: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  registration_url: string;
  image_url: string;
  organizer: string;
  event_status: string;
  status: string;
};

const blank: FormState = {
  title: "",
  description: "",
  event_date: new Date().toISOString().slice(0, 10),
  start_time: "",
  end_time: "",
  location: "",
  registration_url: "",
  image_url: "",
  organizer: "Computer Science Clique",
  event_status: "upcoming",
  status: "draft",
};

function AdminEvents() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const roleQuery = useAdminRole(session?.user.id);
  const isSuper = roleQuery.data?.role === "super_admin";
  const { data, isPending } = useQuery(allEventsQuery);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [schedule, setSchedule] = useState<ScheduleState>(blankSchedule);
  const [saving, setSaving] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
  }

  function startEdit(item: EventRow) {
    setSchedule(scheduleFromRow(item.status, item.scheduled_at));
    setForm({
      id: item.id,
      title: item.title,
      description: item.description ?? "",
      event_date: item.event_date,
      start_time: item.start_time ?? "",
      end_time: item.end_time ?? "",
      location: item.location ?? "",
      registration_url: item.registration_url ?? "",
      image_url: item.image_url ?? "",
      organizer: item.organizer ?? "",
      event_status: item.event_status,
      status: item.status,
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
      description: form.description,
      event_date: form.event_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location.trim() || null,
      registration_url: form.registration_url.trim() || null,
      image_url: form.image_url || null,
      organizer: form.organizer.trim() || null,
      event_status: form.event_status,
      status: resolved.status,
      scheduled_at: resolved.scheduled_at,
    };
    const { error, pending } = await submitChange(
      "events",
      form.id ? "update" : "create",
      form.id ?? null,
      payload,
      `${resolved.status === "scheduled" ? "Schedule" : status === "published" ? "Publish" : "Save draft"} event: ${payload.title}`,
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
    await logAction(form.id ? "update" : "create", "event", form.id ?? null, {
      title: payload.title,
    });
    toast.success(form.id ? "Event updated." : "Event created.");
    setOpen(false);
    refresh();
  }

  async function toggleStatus(item: EventRow) {
    const next = item.status === "published" ? "draft" : "published";
    const { error, pending } = await submitChange("events", "update", item.id, { status: next }, `${next === "published" ? "Publish" : "Unpublish"} event: ${item.title}`);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (pending) {
      toast.success(PENDING_MESSAGE);
      return;
    }
    await logAction(next === "published" ? "publish" : "unpublish", "event", item.id);
    refresh();
  }

  async function remove(item: EventRow) {
    const { error, pending } = await submitChange("events", "delete", item.id, {}, `Delete event: ${item.title}`);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (pending) {
      toast.success(PENDING_MESSAGE);
      return;
    }
    await logAction("delete", "event", item.id, { title: item.title });
    toast.success("Event deleted.");
    refresh();
  }

  return (
    <AdminShell
      title="Events"
      description="Schedule activities, manage registration links, and update statuses"
      actions={
        <Button
          onClick={() => {
            setForm(blank);
            setSchedule(blankSchedule);
            setOpen(true);
          }}
        >
          <Plus className="mr-1 size-4" /> New event
        </Button>
      }
    >
      <div className="overflow-x-auto rounded-2xl game-panel shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Visibility</th>
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
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(item.event_date)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {item.event_status}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                    {item.status === "scheduled" ? (
                      <ScheduleIndicator compact at={item.scheduled_at} approval="approved" />
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
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
                        title="Delete this event?"
                        description="This permanently removes the event from the website."
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
                  No events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit event" : "New event"}</DialogTitle>
            <DialogDescription>Drafts stay private until you publish them.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="etitle">Title</Label>
              <Input
                id="etitle"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edate">Date</Label>
              <Input
                id="edate"
                type="date"
                value={form.event_date}
                onChange={(event) => setForm({ ...form, event_date: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="estart">Start time</Label>
              <Input
                id="estart"
                type="time"
                value={form.start_time}
                onChange={(event) => setForm({ ...form, start_time: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="eend">End time</Label>
              <Input
                id="eend"
                type="time"
                value={form.end_time}
                onChange={(event) => setForm({ ...form, end_time: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="eloc">Venue</Label>
              <Input
                id="eloc"
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="eorg">Organizer</Label>
              <Input
                id="eorg"
                value={form.organizer}
                onChange={(event) => setForm({ ...form, organizer: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ereg">Registration link</Label>
              <Input
                id="ereg"
                value={form.registration_url}
                onChange={(event) => setForm({ ...form, registration_url: event.target.value })}
                placeholder="https://…"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="estatus">Stage</Label>
              <Select
                value={form.event_status}
                onValueChange={(value) => setForm({ ...form, event_status: value })}
              >
                <SelectTrigger id="estatus" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="edesc">Description</Label>
              <Textarea
                id="edesc"
                rows={5}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Event image</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <FileUploader
                  kind="media"
                  label="Upload image"
                  accept="image/*"
                  onUploaded={(result) => setForm({ ...form, image_url: result.url })}
                />
                {form.image_url ? (
                  <>
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="h-14 w-24 rounded-lg border border-border object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, image_url: "" })}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">No image selected</span>
                )}
              </div>
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
