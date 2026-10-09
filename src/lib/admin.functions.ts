import { callerIsStaff, callerIsSuperAdmin } from "@/lib/access";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "carljustin.juntilla@cvsu.edu.ph";

async function assertNotOwner(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (data?.email?.toLowerCase() === OWNER_EMAIL) throw new Error("This account is protected and cannot be changed.");
}

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string; fullName: string; setupKey: string }) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new Error("Invalid email.");
    if (input.password.length < 10)
      throw new Error("Password must be at least 10 characters.");
    if (input.password.length > 128 || input.email.length > 254 || (input.fullName ?? "").length > 120)
      throw new Error("Input is too long.");
    if (typeof input.setupKey !== "string" || input.setupKey.length > 256)
      throw new Error("Invalid setup key.");
    return input;
  })
  .handler(async ({ data }) => {
    const expected = process.env["INITIAL_ADMIN_SETUP_SECRET"];
    if (!expected) throw new Error("Setup is disabled.");
    const { timingSafeEqual } = await import("crypto");
    const a = Buffer.from(data.setupKey);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid setup key.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true });
    if (countError) throw new Error("Setup check failed.");
    if ((count ?? 0) > 0) throw new Error("Setup has already been completed.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account.");

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, email: data.email, full_name: data.fullName });
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "super_admin" });
    if (roleError) throw new Error(roleError.message);

    return { ok: true };
  });

export const setupNeeded = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return { needed: (count ?? 0) === 0 };
  } catch (err) {

    console.error("setupNeeded check failed:", err);
    return { needed: false };
  }
});

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      password: string;
      fullName: string;
      role: "admin" | "super_admin";
    }) => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new Error("Invalid email.");
      if (input.password.length < 10)
        throw new Error("Password must be at least 10 characters.");
      if (input.password.length > 128 || input.email.length > 254 || (input.fullName ?? "").length > 120)
        throw new Error("Input is too long.");
      if (input.role !== "admin" && input.role !== "super_admin")
        throw new Error("Invalid role.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {

    const allowed = await callerIsSuperAdmin(context.supabase);
    if (!allowed) throw new Error("Only super administrators can do this.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account.");

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, email: data.email, full_name: data.fullName });
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (insertError) throw new Error(insertError.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "create",
      entity_type: "administrator",
      entity_id: created.user.id,
      metadata: { email: data.email, role: data.role },
    });

    return { ok: true };
  });

export const updateAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { userId: string; role?: "admin" | "super_admin"; disabled?: boolean }) => {
      if (!/^[0-9a-f-]{36}$/i.test(input.userId ?? "")) throw new Error("Missing administrator.");
      if (input.role !== undefined && input.role !== "admin" && input.role !== "super_admin")
        throw new Error("Invalid role.");
      if (input.disabled !== undefined && typeof input.disabled !== "boolean")
        throw new Error("Invalid value.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const allowed = await callerIsSuperAdmin(context.supabase);
    if (!allowed) throw new Error("Only super administrators can do this.");
    if (data.userId === context.userId && (data.disabled || data.role === "admin")) {
      throw new Error("You cannot remove your own super administrator access.");
    }
    await assertNotOwner(data.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.role === "admin") {
      const { data: current } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", data.userId).maybeSingle();
      if (current?.role === "super_admin")
        throw new Error("Demoting a super administrator needs approval from another super administrator.");
    }

    if (typeof data.disabled === "boolean") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_disabled: data.disabled })
        .eq("id", data.userId);
      if (error) throw new Error(error.message);
    }

    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "update",
      entity_type: "administrator",
      entity_id: data.userId,
      metadata: { role: data.role ?? null, disabled: data.disabled ?? null },
    });

    return { ok: true };
  });

export const updateOwnProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fullName: string }) => {
    const fullName = (input.fullName ?? "").trim();
    if (fullName.length < 1 || fullName.length > 120)
      throw new Error("Name must be between 1 and 120 characters.");
    return { fullName };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.fullName })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "update",
      entity_type: "profile",
      entity_id: context.userId,
      metadata: { full_name: data.fullName },
    });

    return { ok: true };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const allowed = await callerIsStaff(context.supabase);
    if (!allowed) throw new Error("Not allowed.");

    const { data, error } = await context.supabase
      .from("user_roles")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((r) => r.user_id);
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, is_disabled")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const { data: trials } = await context.supabase
      .from("super_admin_trials")
      .select("user_id, expires_at")
      .gt("expires_at", new Date().toISOString());

    return (data ?? []).map((row) => {
      const trialUntil = trials?.find((t) => t.user_id === row.user_id)?.expires_at ?? null;
      const profile = profiles?.find((p) => p.id === row.user_id);
      return {
        userId: row.user_id,
        role: row.role,
        createdAt: row.created_at,
        email: profile?.email ?? "unknown",
        fullName: profile?.full_name ?? null,
        disabled: profile?.is_disabled ?? false,
        trialUntil: row.role === "admin" ? trialUntil : null,
        isSelf: row.user_id === context.userId,
        isOwner: profile?.email?.toLowerCase() === OWNER_EMAIL,
      };
    });
  });

export const grantSuperAdminTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; days: number; hours: number }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.userId ?? "")) throw new Error("Missing administrator.");
    const days = Math.floor(Number(input.days) || 0);
    const hours = Math.floor(Number(input.hours) || 0);
    if (days < 0 || hours < 0 || days > 365 || hours > 23)
      throw new Error("Use 0–365 days and 0–23 hours.");
    if (days === 0 && hours === 0) throw new Error("Choose at least 1 hour.");
    return { userId: input.userId, days, hours };
  })
  .handler(async ({ data, context }) => {
    if (!(await callerIsSuperAdmin(context.supabase)))
      throw new Error("Only super administrators can do this.");
    if (data.userId === context.userId) throw new Error("You cannot give a trial to yourself.");
    await assertNotOwner(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", data.userId).maybeSingle();
    if (role?.role !== "admin") throw new Error("Trials can only be given to regular administrators.");
    const expiresAt = new Date(Date.now() + (data.days * 24 + data.hours) * 3600_000).toISOString();
    const { error } = await supabaseAdmin
      .from("super_admin_trials")
      .upsert({ user_id: data.userId, expires_at: expiresAt, granted_by: context.userId });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, action: "grant_trial", entity_type: "administrator",
      entity_id: data.userId, metadata: { days: data.days, hours: data.hours, expires_at: expiresAt },
    });
    return { ok: true, expiresAt };
  });

export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.userId ?? "")) throw new Error("Missing administrator.");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!(await callerIsSuperAdmin(context.supabase)))
      throw new Error("Only super administrators can do this.");
    if (data.userId === context.userId)
      throw new Error("You cannot remove your own account.");
    await assertNotOwner(data.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();

    await supabaseAdmin.from("super_admin_trials").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "delete",
      entity_type: "administrator",
      entity_id: data.userId,
      metadata: { email: target?.email ?? null },
    });
    return { ok: true };
  });

export const endSuperAdminTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.userId ?? "")) throw new Error("Missing administrator.");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!(await callerIsSuperAdmin(context.supabase)))
      throw new Error("Only super administrators can do this.");
    await assertNotOwner(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("super_admin_trials").delete().eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, action: "end_trial", entity_type: "administrator", entity_id: data.userId,
    });
    return { ok: true };
  });

export const requestSuperAdminDemotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.userId ?? "")) throw new Error("Missing administrator.");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!(await callerIsSuperAdmin(context.supabase)))
      throw new Error("Only super administrators can do this.");
    if (data.userId === context.userId) throw new Error("You cannot demote yourself.");
    await assertNotOwner(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles").select("email, full_name").eq("id", data.userId).maybeSingle();
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", data.userId).maybeSingle();
    if (role?.role !== "super_admin") throw new Error("This account is not a super administrator.");
    const { data: existing } = await supabaseAdmin
      .from("pending_changes").select("id")
      .eq("table_name", "user_roles").eq("record_id", data.userId).eq("status", "pending").limit(1);
    if (existing?.length) throw new Error("A demotion request for this account is already pending.");
    const name = target?.full_name || target?.email || "administrator";
    const { error } = await context.supabase.from("pending_changes").insert({
      table_name: "user_roles",
      action: "update",
      record_id: data.userId,
      payload: { role: "admin", email: target?.email ?? null },
      summary: `Demote ${name} to administrator`,
      submitted_by: context.userId,
      submitted_email: (context.claims as { email?: string }).email ?? null,
    });
    if (error) throw new Error("Could not submit the request.");
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, action: "request demotion", entity_type: "administrator", entity_id: data.userId,
    });
    return { ok: true };
  });

export const approveSuperAdminDemotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { changeId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.changeId ?? "")) throw new Error("Missing request.");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (!(await callerIsSuperAdmin(context.supabase)))
      throw new Error("Only super administrators can do this.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: change } = await supabaseAdmin
      .from("pending_changes").select("table_name, record_id, status, submitted_by")
      .eq("id", data.changeId).maybeSingle();
    if (!change || change.table_name !== "user_roles" || change.status !== "pending" || !change.record_id)
      throw new Error("This request is no longer pending.");
    if (change.submitted_by === context.userId) throw new Error("You cannot approve your own request.");
    await assertNotOwner(change.record_id);
    const { error: reviewError } = await context.supabase.rpc("review_change", {
      _id: data.changeId, _decision: "approved",
    });
    if (reviewError) throw new Error(reviewError.message);
    await supabaseAdmin.from("super_admin_trials").delete().eq("user_id", change.record_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", change.record_id);
    const { error } = await supabaseAdmin
      .from("user_roles").insert({ user_id: change.record_id, role: "admin" });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, action: "approve demotion", entity_type: "administrator", entity_id: change.record_id,
    });
    return { ok: true };
  });
