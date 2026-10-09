import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole, useSession } from "@/hooks/use-csc-auth";
import { updateOwnProfile } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Account Settings — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: account settings." },
      { property: "og:title", content: "Account Settings — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: account settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AdminShell title="Account settings" description="Manage your name and password">
      <div className="grid max-w-3xl gap-6">
        <NameSection />
        <PasswordSection />
      </div>
    </AdminShell>
  ),
});

function NameSection() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const roleQuery = useAdminRole(session?.user.id);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (roleQuery.data?.fullName != null) setName(roleQuery.data.fullName);
  }, [roleQuery.data?.fullName]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return void toast.error("Name cannot be empty.");
    setBusy(true);
    try {
      await updateOwnProfile({ data: { fullName: trimmed } });
      await queryClient.invalidateQueries({ queryKey: ["admin-role"] });
      toast.success("Name updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update name.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl game-panel p-6 shadow-card">
      <h2 className="font-display text-base font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This name is shown as the author of your announcements.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-4 grid gap-4">
        <div>
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
            maxLength={120}
            required
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={session?.user.email ?? ""} readOnly disabled className="mt-1.5" />
        </div>
        <div>
          <Button type="submit" disabled={busy || roleQuery.isPending}>
            {busy ? "Saving…" : "Save name"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function PasswordSection() {
  const { session } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const email = session?.user.email;
    if (!email) return;
    if (next.length < 10) return void toast.error("New password must be at least 10 characters.");
    if (next !== confirm) return void toast.error("New passwords do not match.");
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (authError) throw new Error("Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw new Error(error.message);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl game-panel p-6 shadow-card">
      <h2 className="font-display text-base font-semibold">Change password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your current password, then choose a new one.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-4 grid gap-4">
        <div>
          <Label htmlFor="pw-current">Current password</Label>
          <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="mt-1.5" required />
        </div>
        <div>
          <Label htmlFor="pw-new">New password</Label>
          <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1.5" minLength={10} required />
        </div>
        <div>
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5" minLength={10} required />
        </div>
        <div>
          <Button type="submit" disabled={busy || !session}>
            {busy ? "Saving…" : "Update password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
