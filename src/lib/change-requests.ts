import { callerIsSuperAdmin } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/hooks/use-csc-auth";

const ENTITY: Record<string, string> = {
  announcements: "announcement",
  events: "event",
  transparency_documents: "document",
  organization_settings: "page-content",
};
export const entityLabel = (t: string) => ENTITY[t] ?? t;

export type ChangeTable =
  | "announcements"
  | "events"
  | "transparency_documents"
  | "organization_settings";
export type ChangeAction = "create" | "update" | "delete";

type Result = { error: { message: string } | null; pending: boolean };

export async function applyChange(
  table: ChangeTable,
  action: ChangeAction,
  recordId: string | null,
  payload: Record<string, unknown>,
) {
  const q = supabase.from(table as any) as any;
  if (action === "create") return (await q.insert(payload)) as { error: { message: string } | null };
  if (action === "update") return (await q.update(payload).eq("id", recordId)) as { error: { message: string } | null };
  return (await q.delete().eq("id", recordId)) as { error: { message: string } | null };
}

export async function submitChange(
  table: ChangeTable,
  action: ChangeAction,
  recordId: string | null,
  payload: Record<string, unknown>,
  summary: string,
): Promise<Result> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: { message: "You are not signed in." }, pending: false };
  if (await callerIsSuperAdmin(supabase)) {
    const { error } = await applyChange(table, action, recordId, payload);
    return { error, pending: false };
  }
  const { error } = await (supabase.from("pending_changes" as any) as any).insert({
    table_name: table,
    action,
    record_id: recordId,
    payload,
    summary,
    submitted_by: data.user.id,
    submitted_email: data.user.email ?? null,
  });
  if (!error) {
    await logAction(`request ${action}`, entityLabel(table), recordId, { summary, status: "pending approval" });
  }
  return { error, pending: !error };
}

export const PENDING_MESSAGE = "Sent to a super admin for approval.";
