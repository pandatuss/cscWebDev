import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  UserCheck,
  UserX,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmAction, FileUploader, TippedButton } from "@/components/admin/controls";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { allFacultyQuery } from "@/lib/queries";
import type { FacultyMember } from "@/lib/csc-types";
import { logAction, useAdminRole, useSession } from "@/hooks/use-csc-auth";

export const Route = createFileRoute("/admin/faculty")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Faculty — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: faculty." },
      { property: "og:title", content: "Faculty — CSC Admin" },
      { property: "og:description", content: "Manage faculty profiles in the restricted CSC admin area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminFaculty,
});

type FormState = {
  id?: string;
  name: string;
  title: string;
  position: string;
  email: string;
  photo_url: string;
  display_order: number;
  is_active: boolean;
};

const blank: FormState = {
  name: "",
  title: "",
  position: "",
  email: "",
  photo_url: "",
  display_order: 0,
  is_active: true,
};

function AdminFaculty() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(allFacultyQuery);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const members = data ?? [];
  const { session } = useSession();
  const roleQuery = useAdminRole(session?.user.id);
  const canManage = roleQuery.data?.role === "super_admin";

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "faculty"] });
    void queryClient.invalidateQueries({ queryKey: ["faculty"] });
  }

  function startEdit(item: FacultyMember) {
    setForm({
      id: item.id,
      name: item.name,
      title: item.title,
      position: item.department ?? "",
      email: item.email ?? "",
      photo_url: item.photo_url ?? "",
      display_order: item.display_order,
      is_active: item.is_active,
    });
    setOpen(true);
  }

  async function save() {
    if (form.name.trim().length < 2 || form.position.trim().length < 2) {
      toast.error("Please enter a full name and position.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      title: form.title.trim() || "N/A",
      department: form.position.trim() || null,
      email: form.email.trim() || null,
      photo_url: form.photo_url || null,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
    };
    const { error } = form.id
      ? await supabase.from("faculty_members").update(payload).eq("id", form.id)
      : await supabase.from("faculty_members").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAction(form.id ? "update" : "create", "faculty_member", form.id ?? null, {
      name: payload.name,
    });
    toast.success(form.id ? "Faculty member updated." : "Faculty member added.");
    setOpen(false);
    refresh();
  }

  async function move(item: FacultyMember, direction: -1 | 1) {
    const sorted = [...members].sort((a, b) => a.display_order - b.display_order);
    const index = sorted.findIndex((m) => m.id === item.id);
    const swap = sorted[index + direction];
    if (!swap) return;
    const results = await Promise.all([
      supabase
        .from("faculty_members")
        .update({ display_order: swap.display_order })
        .eq("id", item.id),
      supabase
        .from("faculty_members")
        .update({ display_order: item.display_order })
        .eq("id", swap.id),
    ]);
    const failure = results.find((r) => r.error);
    if (failure?.error) {
      toast.error(failure.error.message);
      return;
    }
    await logAction("update", "faculty_member", item.id, { reordered: true });
    refresh();
  }

  async function toggleActive(item: FacultyMember) {
    const { error } = await supabase
      .from("faculty_members")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAction("update", "faculty_member", item.id, { is_active: !item.is_active });
    refresh();
  }

  async function remove(item: FacultyMember) {
    const { error } = await supabase.from("faculty_members").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAction("delete", "faculty_member", item.id, { name: item.name });
    toast.success("Faculty member removed.");
    refresh();
  }

  return (
    <AdminShell
      title="Faculty"
      description="Manage the faculty list, order, and visibility"
      actions={
        canManage && (
          <Button
            onClick={() => {
              setForm({ ...blank, display_order: members.length + 1 });
              setOpen(true);
            }}
          >
            <Plus className="mr-1 size-4" /> Add faculty member
          </Button>
        )
      }
    >
      <div className="overflow-x-auto rounded-2xl game-panel shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Visibility</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending ? (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : members.length ? (
              [...members]
                .sort((a, b) => a.display_order - b.display_order)
                .map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.photo_url ? (
                          <img
                            src={item.photo_url}
                            alt={item.name}
                            className="size-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="grid size-9 place-items-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-deep">
                            {item.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.department ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          item.is_active
                            ? "bg-success text-success-foreground hover:bg-success"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary"
                        }
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <TippedButton
                            label="Move up"
                            variant="ghost"
                            size="icon"
                            onClick={() => void move(item, -1)}
                          >
                            <ArrowUp className="size-4" />
                          </TippedButton>
                          <TippedButton
                            label="Move down"
                            variant="ghost"
                            size="icon"
                            onClick={() => void move(item, 1)}
                          >
                            <ArrowDown className="size-4" />
                          </TippedButton>
                          <TippedButton
                            label={item.is_active ? "Deactivate" : "Activate"}
                            variant="ghost"
                            size="icon"
                            onClick={() => void toggleActive(item)}
                          >
                            {item.is_active ? (
                              <UserX className="size-4" />
                            ) : (
                              <UserCheck className="size-4" />
                            )}
                          </TippedButton>
                          <TippedButton
                            label="Edit"
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(item)}
                          >
                            <Pencil className="size-4" />
                          </TippedButton>
                          <ConfirmAction
                            tipLabel="Remove"
                            title="Remove this faculty member?"
                            description="This permanently deletes the faculty record."
                            onConfirm={() => remove(item)}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Remove">
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            }
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))
            ) : (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No faculty members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit faculty member" : "Add faculty member"}</DialogTitle>
            <DialogDescription>
              Inactive faculty members stay in the records but are hidden from the public page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fname">Full name</Label>
              <Input
                id="fname"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ftitle">Title</Label>
              <Input
                id="ftitle"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1.5"
                placeholder="PhD, MIT, or N/A"
              />
            </div>
            <div>
              <Label htmlFor="fposition">Position</Label>
              <Input
                id="fposition"
                value={form.position}
                onChange={(event) => setForm({ ...form, position: event.target.value })}
                className="mt-1.5"
                placeholder="IT Faculty, CS Faculty, or Dept Chair"
              />
            </div>
            <div>
              <Label htmlFor="femail">Email</Label>
              <Input
                id="femail"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Photo</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <FileUploader
                  kind="media"
                  label="Upload photo"
                  accept="image/*"
                  onUploaded={(result) => setForm({ ...form, photo_url: result.url })}
                />
                {form.photo_url ? (
                  <img
                    src={form.photo_url}
                    alt="Preview"
                    className="size-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">No photo selected</span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save faculty member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
