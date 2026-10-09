import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ShieldCheck, UserX, UserCheck, Timer, TimerOff, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmAction, TippedButton } from "@/components/admin/controls";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAdminUser,
  deleteAdminUser,
  endSuperAdminTrial,
  grantSuperAdminTrial,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/admin.functions";
import { formatDate } from "@/lib/csc-types";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administrators — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: administrators." },
      { property: "og:title", content: "Administrators — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listAdminUsers(),
  });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "super_admin",
  });

  const [trialFor, setTrialFor] = useState<{ userId: string; name: string } | null>(null);
  const [trial, setTrial] = useState({ days: "1", hours: "0" });

  async function giveTrial() {
    if (!trialFor) return;
    setSaving(true);
    try {
      const res = await grantSuperAdminTrial({
        data: { userId: trialFor.userId, days: Number(trial.days), hours: Number(trial.hours) },
      });
      toast.success(`Super admin trial active until ${new Date(res.expiresAt).toLocaleString()}.`);
      setTrialFor(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the trial.");
    } finally {
      setSaving(false);
    }
  }

  async function stopTrial(userId: string) {
    try {
      await endSuperAdminTrial({ data: { userId } });
      toast.success("Trial ended. They are a regular administrator again.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not end the trial.");
    }
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  }

  async function invite() {
    setSaving(true);
    try {
      await createAdminUser({ data: form });
      toast.success("Administrator account created.");
      setOpen(false);
      setForm({ fullName: "", email: "", password: "", role: "admin" });
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the account.");
    } finally {
      setSaving(false);
    }
  }

  async function update(userId: string, patch: { role?: "admin" | "super_admin"; disabled?: boolean }) {
    try {
      await updateAdminUser({ data: { userId, ...patch } });
      toast.success("Administrator updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the account.");
    }
  }

  async function remove(userId: string) {
    try {
      await deleteAdminUser({ data: { userId } });
      toast.success("Account removed.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the account.");
    }
  }

  return (
    <AdminShell
      requireSuperAdmin
      title="Administrators"
      description="Only super administrators can invite accounts, change roles, or disable access"
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 size-4" /> Invite administrator
        </Button>
      }
    >
      <div className="overflow-x-auto rounded-2xl game-panel shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Status</th>
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
            ) : (
              (data ?? []).map((row) => (
                <tr key={row.userId}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{row.fullName ?? row.email}</span>
                    <span className="block text-xs text-muted-foreground">{row.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        row.role === "super_admin"
                          ? "bg-primary text-primary-foreground hover:bg-primary"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary"
                      }
                    >
                      {row.role === "super_admin" ? "Super administrator" : "Administrator"}
                    </Badge>
                    {row.trialUntil ? (
                      <div className="mt-1 text-xs text-primary">
                        Super admin trial until {new Date(row.trialUntil).toLocaleString()}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.disabled ? "Disabled" : "Active"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {row.role === "admin" && !row.trialUntil ? (
                        <TippedButton
                          label="Give super admin trial"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTrial({ days: "1", hours: "0" });
                            setTrialFor({ userId: row.userId, name: row.fullName ?? row.email });
                          }}
                        >
                          <Timer className="size-4" />
                        </TippedButton>
                      ) : null}
                      {row.trialUntil ? (
                        <ConfirmAction
                          tipLabel="End trial now"
                          title="End super admin trial now?"
                          description="They will go back to being a regular administrator immediately."
                          confirmLabel="End trial"
                          onConfirm={() => stopTrial(row.userId)}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="End trial" title="End trial">
                              <TimerOff className="size-4" />
                            </Button>
                          }
                        />
                      ) : null}
                      {row.role === "admin" ? (
                        <ConfirmAction
                          tipLabel="Promote to super administrator"
                          title="Promote to super administrator?"
                          description="Super administrators can manage accounts and sensitive settings."
                          confirmLabel="Promote"
                          onConfirm={() => update(row.userId, { role: "super_admin" })}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Promote">
                              <ShieldCheck className="size-4" />
                            </Button>
                          }
                        />
                      ) : null}
                      {!row.isSelf ? (
                        <ConfirmAction
                          tipLabel={row.disabled ? "Restore access" : "Disable access"}
                          title={row.disabled ? "Restore access?" : "Disable this account?"}
                          description={
                            row.disabled
                              ? "The administrator will be able to sign in again."
                              : "The administrator will immediately lose dashboard access."
                          }
                          confirmLabel={row.disabled ? "Restore" : "Disable"}
                          onConfirm={() => update(row.userId, { disabled: !row.disabled })}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={row.disabled ? "Restore access" : "Disable access"}
                            >
                              {row.disabled ? (
                                <UserCheck className="size-4" />
                              ) : (
                                <UserX className="size-4 text-destructive" />
                              )}
                            </Button>
                          }
                        />
                      ) : null}
                      {!row.isSelf ? (
                        <ConfirmAction
                          tipLabel="Remove account"
                          title="Remove this account?"
                          description="This permanently deletes the account and its sign-in. This cannot be undone."
                          confirmLabel="Remove account"
                          onConfirm={() => remove(row.userId)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remove account"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          }
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite administrator</DialogTitle>
            <DialogDescription>
              Share the temporary password privately. There is no public sign-up.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="uname">Full name</Label>
              <Input
                id="uname"
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="uemail">Email</Label>
              <Input
                id="uemail"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="upass">Temporary password</Label>
              <Input
                id="upass"
                type="text"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="At least 10 characters"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="urole">Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm({ ...form, role: value as "admin" | "super_admin" })
                }
              >
                <SelectTrigger id="urole" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="super_admin">Super administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void invite()} disabled={saving}>
              {saving ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!trialFor} onOpenChange={(o) => !o && setTrialFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Super admin trial</DialogTitle>
            <DialogDescription>
              {trialFor?.name} gets super administrator access for this long, then automatically
              returns to a regular administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tdays">Days</Label>
              <Input id="tdays" type="number" min={0} max={365} value={trial.days}
                onChange={(e) => setTrial({ ...trial, days: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="thours">Hours</Label>
              <Input id="thours" type="number" min={0} max={23} value={trial.hours}
                onChange={(e) => setTrial({ ...trial, hours: e.target.value })} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialFor(null)}>Cancel</Button>
            <Button onClick={() => void giveTrial()} disabled={saving}>
              {saving ? "Starting…" : "Start trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
