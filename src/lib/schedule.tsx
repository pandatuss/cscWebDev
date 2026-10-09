import { CalendarClock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const TIMEZONE = "Asia/Manila";

export type ScheduleState = { enabled: boolean; date: string; time: string };
export const blankSchedule: ScheduleState = { enabled: false, date: "", time: "" };

export function manilaToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}:00+08:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function isoToManila(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString();
  return { date: d.slice(0, 10), time: d.slice(11, 16) };
}

export function scheduleFromRow(status?: string | null, scheduledAt?: string | null): ScheduleState {
  return status === "scheduled" && scheduledAt
    ? { enabled: true, ...isoToManila(scheduledAt) }
    : blankSchedule;
}

export function formatSchedule(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function resolvePublish(
  action: "draft" | "published",
  schedule: ScheduleState,
): { status: "draft" | "published" | "scheduled"; scheduled_at: string | null } | { error: string } {
  if (action === "draft" || !schedule.enabled) return { status: action, scheduled_at: null };
  const iso = manilaToIso(schedule.date, schedule.time);
  if (!iso) return { error: "Please choose a scheduled date and time." };
  if (new Date(iso).getTime() <= Date.now()) return { error: "The scheduled time must be in the future." };
  return { status: "scheduled", scheduled_at: iso };
}

export function ScheduleFields({
  value,
  onChange,
}: {
  value: ScheduleState;
  onChange: (next: ScheduleState) => void;
}) {
  const today = isoToManila(new Date().toISOString()).date;
  return (
    <div className="space-y-3 rounded-xl border border-border p-4 sm:col-span-2">
      <label className="flex items-center justify-between gap-3 text-sm font-medium">
        Schedule Post
        <Switch checked={value.enabled} onCheckedChange={(enabled) => onChange({ ...value, enabled })} />
      </label>
      {value.enabled ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="sched-date">Scheduled date</Label>
              <Input id="sched-date" type="date" min={today} value={value.date} className="mt-1.5"
                onChange={(e) => onChange({ ...value, date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sched-time">Scheduled time</Label>
              <Input id="sched-time" type="time" value={value.time} className="mt-1.5"
                onChange={(e) => onChange({ ...value, time: e.target.value })} />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input value={TIMEZONE} readOnly disabled className="mt-1.5" />
            </div>
          </div>
          {manilaToIso(value.date, value.time) ? (
            <ScheduleIndicator at={manilaToIso(value.date, value.time)} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function ScheduleIndicator({
  at,
  approval,
  published,
  compact,
}: {
  at: string | null | undefined;
  approval?: string;
  published?: boolean;
  compact?: boolean;
}) {
  if (!at) return null;
  if (published) {
    return (
      <p className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle2 className="size-3.5" /> Published {formatSchedule(at)}
      </p>
    );
  }
  const past = new Date(at).getTime() <= Date.now();
  const missed = past && approval && approval !== "approved";
  if (compact) {
    return (
      <p className={`inline-flex items-center gap-1 text-xs ${missed ? "text-destructive" : "text-primary"}`}>
        {missed ? <AlertTriangle className="size-3.5" /> : <CalendarClock className="size-3.5" />}
        {missed ? "Schedule missed · " : ""}
        {formatSchedule(at)}
      </p>
    );
  }
  return (
    <div className={`rounded-xl border p-3 text-sm ${missed ? "border-destructive/40 bg-destructive/10" : "border-primary/40 bg-primary/10"}`}>
      <p className="flex items-center gap-1.5 font-semibold">
        <CalendarClock className="size-4" /> Scheduled Post
      </p>
      <p>Scheduled for: {formatSchedule(at)} ({TIMEZONE})</p>
      {missed && approval === "pending" ? (
        <p className="mt-1 flex items-center gap-1 text-destructive">
          <AlertTriangle className="size-4" /> Schedule missed — this post passed its scheduled time and is still
          awaiting approval. Set a new future time before it can be approved.
        </p>
      ) : missed ? (
        <p className="mt-1 text-destructive">The scheduled time has passed. Choose a new future time before resubmitting.</p>
      ) : approval === "approved" ? (
        <p className="mt-1 text-muted-foreground">
          Approved. This post will remain unpublished until its scheduled date and time, then publish automatically.
        </p>
      ) : (
        <p className="mt-1 text-muted-foreground">The post will automatically be published at the scheduled time, once approved.</p>
      )}
    </div>
  );
}
