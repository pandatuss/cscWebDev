import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CscLogo } from "@/components/site/csc-logo";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapFirstAdmin, setupNeeded } from "@/lib/admin.functions";
import { logAction } from "@/hooks/use-csc-auth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Administrator sign in — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: administrator sign in." },
      { property: "og:title", content: "Administrator sign in — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: administrator sign in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const setup = useQuery({
    queryKey: ["admin", "setup-needed"],
    queryFn: () => setupNeeded(),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsSetup = setup.data?.needed === true;
  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    localStorage.setItem("csc-admin-last-activity", String(Date.now()));
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError || !data.user) {
      setBusy(false);
      setError("Incorrect email or password.");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_disabled")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!roles?.length || profile?.is_disabled) {
      await supabase.auth.signOut();
      setBusy(false);
      setError("This account does not have administrator access.");
      return;
    }

    await logAction("login", "session", data.user.id);
    setBusy(false);
    navigate({ to: "/admin/dashboard", replace: true });
  }

  async function handleSetup(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      await bootstrapFirstAdmin({
        data: { email: email.trim(), password, fullName: fullName.trim() || "Administrator", setupKey },
      });
      toast.success("Super administrator created. You can sign in now.");
      await setup.refetch();
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup failed.");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-subtle px-4 py-12">
      <div className="w-full max-w-md rounded-2xl game-panel p-8 shadow-lift">
        <div className="flex flex-col items-center text-center">
          <CscLogo className="size-20" />
          <h1 className="mt-4 font-display text-xl font-bold">Computer Science Clique</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {needsSetup ? "Create the first super administrator" : "Administrator sign in"}
          </p>
        </div>

        <form onSubmit={needsSetup ? handleSetup : handleSignIn} className="mt-8 space-y-4">
          {needsSetup ? (
            <>
              <div>
                <Label htmlFor="setupKey">Setup key</Label>
                <Input
                  id="setupKey"
                  type="password"
                  autoComplete="off"
                  value={setupKey}
                  onChange={(event) => setSetupKey(event.target.value)}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1.5"
                  required
                />
              </div>
            </>
          ) : null}
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5"
              required
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : needsSetup ? "Create super administrator" : "Sign in"}
          </Button>
        </form>

        {needsSetup ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            This one-time setup is only available while no administrator exists.
          </p>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-2 text-sm">
            <p className="text-xs text-muted-foreground">
              Administrator accounts are created by invitation only.
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            Back to the public website
          </Link>
        </div>
      </div>
    </div>
  );
}
