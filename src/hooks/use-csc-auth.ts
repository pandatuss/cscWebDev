import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminRole = "admin" | "super_admin" | null;

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export function useAdminRole(userId?: string) {
  return useQuery({
    queryKey: ["admin-role", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId!),
        supabase
          .from("profiles")
          .select("full_name, email, is_disabled")
          .eq("id", userId!)
          .maybeSingle(),
      ]);

      const roleList = (roles ?? []).map((r) => r.role);
      const role: AdminRole = roleList.includes("super_admin")
        ? "super_admin"
        : roleList.includes("admin")
          ? "admin"
          : null;

      return {
        role: profile?.is_disabled ? null : role,
        disabled: Boolean(profile?.is_disabled),
        fullName: profile?.full_name ?? null,
        email: profile?.email ?? null,
      };
    },
  });
}

export async function logAction(
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_logs").insert({
    user_id: data.user.id,
    user_email: data.user.email ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: metadata as never,
  });
}
