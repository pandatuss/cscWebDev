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
import { allDocumentsQuery } from "@/lib/queries";
import {
  TRANSPARENCY_CATEGORIES,
  formatDate,
  formatFileSize,
  slugify,
} from "@/lib/csc-types";
import type { TransparencyDocument } from "@/lib/csc-types";
import { logAction, useAdminRole, useSession } from "@/hooks/use-csc-auth";
import { ScheduleFields, ScheduleIndicator, blankSchedule, resolvePublish, scheduleFromRow, type ScheduleState } from "@/lib/schedule";

export const Route = createFileRoute("/admin/transparency")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Transparency — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: transparency." },
      { property: "og:title", content: "Transparency — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: transparency." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminTransparency,
});

type FormState = {
  id?: string;
  title: string;
  description: string;
  category: string;
  academic_year: string;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number;
  status: string;
  published_at: string;
};

const blank: FormState = {
  title: "",
  description: "",
  category: "Financial Reports",
  academic_year: "2026-2027",
  document_type: "PDF",
  file_url: "",
  file_name: "",
  file_size: 0,
  status: "draft",
  published_at: new Date().toISOString().slice(0, 10),
};

function AdminTransparency() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const roleQuery = useAdminRole(session?.user.id);
  const isSuper = roleQuery.data?.role === "super_admin";
  const { data, isPending } = useQuery(allDocumentsQuery);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [schedule, setSchedule] = useState<ScheduleState>(blankSchedule);
  const [saving, setSaving] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "documents"] });
    void queryClient.invalidateQueries({ queryKey: ["documents"] });
  }

  function startEdit(item: TransparencyDocument) {
    setSchedule(scheduleFromRow(item.status, item.scheduled_at));
    setForm({
      id: item.id,
      title: item.title,
      description: item.description ?? "",
      category: item.category,
      academic_year: item.academic_year ?? "",
      document_type: item.document_type ?? "PDF",
      file_url: item.file_url ?? "",
      file_name: item.file_name ?? "",
      file_size: item.file_size ?? 0,
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
    if (!form.file_url) {
      toast.error("Please upload the document file.");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      ...(form.id ? {} : { slug: slugify(form.title) }),
      description: form.description.trim() || null,
      category: form.category,
      academic_year: form.academic_year.trim() || null,
      document_type: form.document_type || null,
      file_url: form.file_url,
      file_name: form.file_name || null,
      file_size: form.file_size || null,
      status: resolved.status,
      scheduled_at: resolved.scheduled_at,
      published_at:
        status === "published" ? new Date(form.published_at).toISOString() : null,
    };
    const { error, pending } = await submitChange(
      "transparency_documents",
      form.id ? "update" : "create",
      form.id ?? null,
      payload,
      `${resolved.status === "scheduled" ? "Schedule" : status === "published" ? "Publish" : "Save draft"} document: ${payload.title}`,
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
    await logAction(form.id ? "update" : "upload", "document", form.id ?? null, {
      title: payload.title,
    });
    toast.success(form.id ? "Document updated." : "Document uploaded.");
    setOpen(false);
    refresh();
  }

  async function toggleStatus(item: TransparencyDocument) {
    const next = item.status === "published" ? "draft" : "published";
    const { error, pending } = await submitChange(
      "transparency_documents",
      "update",
      item.id,
      {
        status: next,
        published_at: next === "published" ? (item.published_at ?? new Date().toISOString()) : null,
      },
      `${next === "published" ? "Publish" : "Unpublish"} document: ${item.title}`,
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    if (pending) {
      toast.success(PENDING_MESSAGE);
      return;
    }
    await logAction(next === "published" ? "publish" : "unpublish", "document", item.id);
    refresh();
  }

  async function remove(item: TransparencyDocument) {
    const { error, pending } = await submitChange("transparency_documents", "delete", item.id, {}, `Delete document: ${item.title}`);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (pending) {
      toast.success(PENDING_MESSAGE);
      return;
    }
    await logAction("delete", "document", item.id, { title: item.title });
    toast.success("Document deleted.");
    refresh();
  }

  return (
    <AdminShell
      title="Transparency documents"
      description="Upload and publish financial reports, audits, policies, and organizational records"
      actions={
        <Button
          onClick={() => {
            setForm(blank);
            setSchedule(blankSchedule);
            setOpen(true);
          }}
        >
          <Plus className="mr-1 size-4" /> Upload document
        </Button>
      }
    >
      <div className="overflow-x-auto rounded-2xl game-panel shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Academic year</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : (data ?? []).length ? (
              (data ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(item.published_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.academic_year ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatFileSize(item.file_size)}
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
                        title="Delete this document?"
                        description="This removes the document record from the transparency page."
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
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit document" : "Upload document"}</DialogTitle>
            <DialogDescription>
              Files are stored privately and shared through a secure link.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="dtitle">Title</Label>
              <Input
                id="dtitle"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="dcat">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger id="dcat" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPARENCY_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dyear">Academic year</Label>
              <Input
                id="dyear"
                value={form.academic_year}
                onChange={(event) => setForm({ ...form, academic_year: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="dtype">Document type</Label>
              <Input
                id="dtype"
                value={form.document_type}
                onChange={(event) => setForm({ ...form, document_type: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ddate">Publication date</Label>
              <Input
                id="ddate"
                type="date"
                value={form.published_at}
                onChange={(event) => setForm({ ...form, published_at: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ddesc">Description</Label>
              <Textarea
                id="ddesc"
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>File</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <FileUploader
                  kind="documents"
                  label="Upload file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                  onUploaded={(result) =>
                    setForm({
                      ...form,
                      file_url: result.url,
                      file_name: result.fileName,
                      file_size: result.fileSize,
                      document_type:
                        result.fileName.split(".").pop()?.toUpperCase() ?? form.document_type,
                    })
                  }
                />
                <span className="text-xs text-muted-foreground">
                  {form.file_name
                    ? `${form.file_name} · ${formatFileSize(form.file_size)}`
                    : "PDF, Word, Excel, or image up to 25 MB"}
                </span>
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
