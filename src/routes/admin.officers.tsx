import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, UserCheck, UserX } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmAction, FileUploader, TippedButton } from "@/components/admin/controls";
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
import { allOfficersQuery } from "@/lib/queries";
import type { Officer } from "@/lib/csc-types";
import { logAction, useAdminRole, useSession } from "@/hooks/use-csc-auth";
import { OfficerBirthdays } from "@/components/admin/officer-birthdays";
import { manilaToday, officerBirthdatesQuery, validateBirthdate } from "@/lib/birthdays";

export const Route = createFileRoute("/admin/officers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Officers — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: officers." },
      { property: "og:title", content: "Officers — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: officers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminOfficers,
});

type FormState = {
  id?: string;
  name: string;
  position: string;
  program: string;
  academic_year: string;
  biography: string;
  photo_url: string;
  email: string;
  facebook_url: string;
  linkedin_url: string;
  display_order: number;
  is_active: boolean;
  birthdate: string;
  hadBirthdate?: boolean;
};

const CURRENT_TERM = "2026-2027";

const blank: FormState = {
  name: "",
  position: "",
  program: "BS Computer Science",
  academic_year: CURRENT_TERM,
  biography: "",
  photo_url: "",
  email: "",
  facebook_url: "",
  linkedin_url: "",
  display_order: 0,
  is_active: true,
  birthdate: "",
};

function AdminOfficers() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(allOfficersQuery);
  const birthdates = useQuery(officerBirthdatesQuery);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const allOfficers = data ?? [];
  const years = Array.from(
    new Set(allOfficers.map((o) => o.academic_year).filter((y): y is string => !!y)),
  ).sort().reverse();
  const [yearFilter, setYearFilter] = useState("all");
  const officers =
    yearFilter === "all" ? allOfficers : allOfficers.filter((o) => o.academic_year === yearFilter);
  const { session } = useSession();
  const roleQuery = useAdminRole(session?.user.id);
  const canManage = roleQuery.data?.role === "super_admin";

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "officers"] });
    void queryClient.invalidateQueries({ queryKey: ["officers"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "officer-birthdates"] });
  }

  function startEdit(item: Officer) {
    setForm({
      id: item.id,
      name: item.name,
      position: item.position,
      program: item.program ?? "",
      academic_year: item.academic_year ?? "",
      biography: item.biography ?? "",
      photo_url: item.photo_url ?? "",
      email: item.email ?? "",
      facebook_url: item.facebook_url ?? "",
      linkedin_url: item.linkedin_url ?? "",
      display_order: item.display_order,
      is_active: item.is_active,
      birthdate: birthdates.data?.get(item.id) ?? "",
      hadBirthdate: !!birthdates.data?.get(item.id),
    });
    setOpen(true);
  }

  async function save() {
    if (form.name.trim().length < 2 || form.position.trim().length < 2) {
      toast.error("Please enter a name and position.");
      return;
    }
    if (form.birthdate || !form.id || form.hadBirthdate) {
      const problem = validateBirthdate(form.birthdate);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      position: form.position.trim(),
      program: form.program.trim() || null,
      academic_year: form.academic_year.trim() || null,
      biography: form.biography.trim() || null,
      photo_url: form.photo_url || null,
      email: form.email.trim() || null,
      facebook_url: form.facebook_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
    };
    const result = form.id
      ? await supabase.from("officers").update(payload).eq("id", form.id).select("id").single()
      : await supabase.from("officers").insert(payload).select("id").single();
    if (result.error) {
      setSaving(false);
      toast.error(result.error.message);
      return;
    }
    const officerId = result.data.id;
    if (form.birthdate) {
      const { error: bErr } = await (supabase.from("officer_birthdates" as any) as any).upsert({
        officer_id: officerId,
        birthdate: form.birthdate,
      });
      if (bErr) {
        setSaving(false);
        toast.error(`Officer saved, but the birthdate couldn't be saved: ${bErr.message}`);
        refresh();
        return;
      }
    }
    setSaving(false);
    await logAction(form.id ? "update" : "create", "officer", officerId, {
      name: payload.name,
    });
    toast.success(form.id ? "Officer updated." : "Officer added.");
    setOpen(false);
    refresh();
  }

  async function move(item: Officer, direction: -1 | 1) {
    const sorted = [...officers].sort((a, b) => a.display_order - b.display_order);
    const index = sorted.findIndex((o) => o.id === item.id);
    const swap = sorted[index + direction];
    if (!swap) return;
    const results = await Promise.all([
      supabase.from("officers").update({ display_order: swap.display_order }).eq("id", item.id),
      supabase.from("officers").update({ display_order: item.display_order }).eq("id", swap.id),
    ]);
    const failure = results.find((r) => r.error);
    if (failure?.error) {
      toast.error(failure.error.message);
      return;
    }
    await logAction("update", "officer", item.id, { reordered: true });
    refresh();
  }

  async function toggleActive(item: Officer) {
    const { error } = await supabase
      .from("officers")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAction("update", "officer", item.id, { is_active: !item.is_active });
    refresh();
  }

  async function remove(item: Officer) {
    const { error } = await supabase.from("officers").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAction("delete", "officer", item.id, { name: item.name });
    toast.success("Officer removed.");
    refresh();
  }

  return (
    <AdminShell
      title="Officers"
      description="Manage the officer roster, order, and visibility"
      actions={
        canManage && <Button
          onClick={() => {
            setForm({
              ...blank,
              academic_year: yearFilter !== "all" ? yearFilter : CURRENT_TERM,
              display_order: allOfficers.length + 1,
            });
            setOpen(true);
          }}
        >
          <Plus className="mr-1 size-4" /> Add officer
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Label htmlFor="yearFilter">School year</Label>
        <select
          id="yearFilter"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All school years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          To add a new school year, type it in the Academic year field when adding an officer.
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl game-panel shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Officer</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Visibility</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : officers.length ? (
              [...officers]
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
                    <td className="px-4 py-3 text-muted-foreground">{item.position}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.program ?? "—"}</td>
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
                          variant="ghost"
                          size="icon"
                          label="Move up"
                          onClick={() => void move(item, -1)}
                        >
                          <ArrowUp className="size-4" />
                        </TippedButton>
                        <TippedButton
                          variant="ghost"
                          size="icon"
                          label="Move down"
                          onClick={() => void move(item, 1)}
                        >
                          <ArrowDown className="size-4" />
                        </TippedButton>
                        <TippedButton
                          variant="ghost"
                          size="icon"
                          label={item.is_active ? "Deactivate" : "Activate"}
                          onClick={() => void toggleActive(item)}
                        >
                          {item.is_active ? (
                            <UserX className="size-4" />
                          ) : (
                            <UserCheck className="size-4" />
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
                          title="Remove this officer?"
                          description="This permanently deletes the officer record."
                          tipLabel="Remove"
                          onConfirm={() => remove(item)}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Remove">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          }
                        />
                      </div>
                    </td>)}
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-10 text-center text-muted-foreground">
                  No officers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <OfficerBirthdays officers={allOfficers} years={years} canManage={canManage} onEdit={startEdit} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit officer" : "Add officer"}</DialogTitle>
            <DialogDescription>
              Inactive officers stay in the records but are hidden from the public page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="oname">Full name</Label>
              <Input
                id="oname"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="opos">Position</Label>
              <Input
                id="opos"
                value={form.position}
                onChange={(event) => setForm({ ...form, position: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="oprog">Program</Label>
              <Input
                id="oprog"
                value={form.program}
                onChange={(event) => setForm({ ...form, program: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="oyear">Academic year</Label>
              <Input
                id="oyear"
                value={form.academic_year}
                onChange={(event) => setForm({ ...form, academic_year: event.target.value })}
                className="mt-1.5"
                list="oyear-list"
                placeholder="e.g. 2026-2027"
              />
              <datalist id="oyear-list">
                {years.map((y) => (
                  <option key={y} value={y} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="oemail">Email</Label>
              <Input
                id="oemail"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="oorder">Display order</Label>
              <Input
                id="oorder"
                type="number"
                value={form.display_order}
                onChange={(event) =>
                  setForm({ ...form, display_order: Number(event.target.value) })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ofb">Facebook link</Label>
              <Input
                id="ofb"
                value={form.facebook_url}
                onChange={(event) => setForm({ ...form, facebook_url: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="oli">LinkedIn link</Label>
              <Input
                id="oli"
                value={form.linkedin_url}
                onChange={(event) => setForm({ ...form, linkedin_url: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="obio">Short biography</Label>
              <Textarea
                id="obio"
                rows={3}
                value={form.biography}
                onChange={(event) => setForm({ ...form, biography: event.target.value })}
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
            <div className="sm:col-span-2">
              <Label htmlFor="obirth">Birthdate</Label>
              <Input
                id="obirth"
                type="date"
                max={manilaToday().iso}
                value={form.birthdate}
                onChange={(event) => setForm({ ...form, birthdate: event.target.value })}
                className="mt-1.5 sm:w-60"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Birthdate is required for internal officer management and will not be displayed publicly.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              Show on the public officers page
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save officer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
