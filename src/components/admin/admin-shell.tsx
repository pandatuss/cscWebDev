import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  FileText,
  GraduationCap,
  Users,
  Settings,
  ShieldCheck,
  ScrollText,
  LogOut,
  Menu,
  X,
  Mail,
  KeyRound,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CscLogo } from "@/components/site/csc-logo";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole, useSession, logAction } from "@/hooks/use-csc-auth";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/transparency", label: "Transparency", icon: FileText },
  { to: "/admin/approvals", label: "Pending approval", icon: ClipboardCheck, superOnly: true },
  { to: "/admin/messages", label: "Contact messages", icon: Mail },
  { to: "/admin/submissions", label: "My submissions", icon: ClipboardCheck },
  { to: "/admin/officers", label: "Officers", icon: Users },
  { to: "/admin/faculty", label: "Faculty", icon: GraduationCap },
  { to: "/admin/settings", label: "Org Info", icon: Settings },
  { to: "/admin/users", label: "Administrators", icon: ShieldCheck, superOnly: true },
  { to: "/admin/audit-logs", label: "Audit logs", icon: ScrollText, superOnly: true },
  { to: "/admin/profile", label: "Account settings", icon: KeyRound },
] as const;

export function AdminShell({
  title,
  description,
  actions,
  requireSuperAdmin = false,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  requireSuperAdmin?: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, loading } = useSession();
  const roleQuery = useAdminRole(session?.user.id);
  const [open, setOpen] = useState(false);
  const unreadQuery = useQuery({
    queryKey: ["unread-messages"],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await (supabase.from("contact_messages") as any)
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
        .eq("is_spam", false)
        .is("deleted_at", null);
      if (error) throw error;
      return (count as number | null) ?? 0;
    },
  });
  const unreadCount = unreadQuery.data ?? 0;
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel("sidebar-unread-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session, queryClient]);
  const pendingQuery = useQuery({
    queryKey: ["pending-approval-count"],
    enabled: !!session && roleQuery.data?.role === "super_admin",
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pending_changes")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });
  const pendingCount = pendingQuery.data ?? 0;

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    const KEY = "csc-admin-last-activity";
    const LIMIT = 20 * 60 * 1000;
    let signingOut = false;
    const stored = Number(localStorage.getItem(KEY));
    if (!stored || Date.now() - stored <= LIMIT) {
      localStorage.setItem(KEY, String(Date.now()));
    }
    let lastWrite = 0;
    const touch = () => {
      const now = Date.now();
      if (now - lastWrite < 5000) return;
      lastWrite = now;
      localStorage.setItem(KEY, String(now));
    };
    const check = async () => {
      const last = Number(localStorage.getItem(KEY)) || Date.now();
      if (signingOut || Date.now() - last < LIMIT) return;
      signingOut = true;
      localStorage.removeItem(KEY);
      try {
        await logAction("auto logout", "session", userId);
      } catch {
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.info("You were signed out after 20 minutes of inactivity.");
      navigate({ to: "/admin/login", replace: true });
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, 30000);
    check();
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [userId, navigate, queryClient]);

  if (loading || (session && roleQuery.isPending)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </div>
    );
  }

  if (!session) {
    return <AccessDenied signIn />;
  }

  const role = roleQuery.data?.role ?? null;
  if (!role || (requireSuperAdmin && role !== "super_admin")) {
    return <AccessDenied />;
  }

  async function handleSignOut() {
    if (!userId) return;
    await logAction("logout", "session", userId);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  const items = navItems.filter((item) => !("superOnly" in item && item.superOnly) || role === "super_admin");

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="flex">
        <aside
          className={`${open ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-64 border-r border-sidebar-border bg-sidebar flex-col p-4 lg:sticky lg:top-0 lg:flex lg:h-screen`}
        >
          <div className="flex items-center justify-between">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <CscLogo className="size-9" />
              <span className="font-display text-sm font-bold">CSC Admin</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </Button>
          </div>

          <nav className="mt-6 -mr-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-2" aria-label="Admin">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
                {item.to === "/admin/messages" && unreadCount > 0 ? (
                  <span
                    className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground"
                    aria-label={`${unreadCount} unread messages`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
                {item.to === "/admin/approvals" && role === "super_admin" && pendingCount > 0 ? (
                  <span
                    className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground"
                    aria-label={`${pendingCount} pending approvals`}
                  >
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="mt-4 shrink-0 rounded-xl border border-sidebar-border bg-background p-3 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{roleQuery.data?.fullName ?? session.user.email}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {role === "super_admin" ? "Super administrator" : "Administrator"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                asChild
              >
                <Link to="/admin/profile" aria-label="Account settings" title="Account settings">
                  <Settings className="size-4" />
                </Link>
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="mr-1 size-4" /> Sign out
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{title}</h1>
              {description ? (
                <p className="truncate text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions}
          </header>
          <div className="px-4 py-6 sm:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function AccessDenied({ signIn = false }: { signIn?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {signIn ? (
            <Button asChild>
              <Link to="/admin/login">Sign in</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
