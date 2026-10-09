import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BirthdateRow = { officer_id: string; birthdate: string };

export const officerBirthdatesQuery = queryOptions({
  queryKey: ["admin", "officer-birthdates"],
  queryFn: async () => {
    const { data, error } = await (supabase.from("officer_birthdates" as any) as any).select(
      "officer_id, birthdate",
    );
    if (error) throw error;
    return new Map(((data ?? []) as BirthdateRow[]).map((r) => [r.officer_id, r.birthdate]));
  },
  refetchInterval: 5 * 60 * 1000,
});

export function manilaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number) as [number, number, number];
  return { y, m, d, iso: parts };
}

export function parseBirthdate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return { y, m, d };
}

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function observedDay(m: number, d: number, year: number) {
  return m === 2 && d === 29 && !isLeap(year) ? 28 : d;
}

export function isBirthdayToday(iso: string, today = manilaToday()) {
  const b = parseBirthdate(iso);
  return b.m === today.m && observedDay(b.m, b.d, today.y) === today.d;
}

export function ageOf(iso: string, today = manilaToday()) {
  const b = parseBirthdate(iso);
  let age = today.y - b.y;
  const day = observedDay(b.m, b.d, today.y);
  if (today.m < b.m || (today.m === b.m && today.d < day)) age -= 1;
  return age;
}

export function daysUntil(iso: string, today = manilaToday()) {
  const b = parseBirthdate(iso);
  const t = Date.UTC(today.y, today.m - 1, today.d);
  let next = Date.UTC(today.y, b.m - 1, observedDay(b.m, b.d, today.y));
  if (next < t) next = Date.UTC(today.y + 1, b.m - 1, observedDay(b.m, b.d, today.y + 1));
  return Math.round((next - t) / 86400000);
}

export function formatBirthdate(iso: string) {
  const b = parseBirthdate(iso);
  return new Date(Date.UTC(b.y, b.m - 1, b.d)).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatMonthDay(iso: string) {
  const b = parseBirthdate(iso);
  return new Date(Date.UTC(2000, b.m - 1, b.d)).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
  });
}

export function validateBirthdate(value: string): string | null {
  if (!value) return "Birthdate is required.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Please enter a valid birthdate.";
  const b = parseBirthdate(value);
  const dt = new Date(Date.UTC(b.y, b.m - 1, b.d));
  if (dt.getUTCMonth() !== b.m - 1 || dt.getUTCDate() !== b.d || b.y < 1900)
    return "Please enter a valid birthdate.";
  if (value > manilaToday().iso) return "Birthdate cannot be in the future.";
  return null;
}
