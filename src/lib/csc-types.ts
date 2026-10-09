import type { Database } from "@/integrations/supabase/types";

export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type TransparencyDocument =
  Database["public"]["Tables"]["transparency_documents"]["Row"];
export type Officer = Database["public"]["Tables"]["officers"]["Row"];
export type FacultyMember =
  Database["public"]["Tables"]["faculty_members"]["Row"];
export type OrganizationSettings =
  Database["public"]["Tables"]["organization_settings"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type ContactMessage = Database["public"]["Tables"]["contact_messages"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const ANNOUNCEMENT_CATEGORIES = [
  "General",
  "Organization",
  "Academics",
  "Events",
  "Transparency",
] as const;

export const TRANSPARENCY_CATEGORIES = [
  "Financial Reports",
  "Audit Reports",
  "Organizational Documents",
  "Policies",
] as const;

export const EVENT_STATUSES = ["upcoming", "ongoing", "completed", "cancelled"] as const;

export const OFFICER_POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Public Information Officer",
] as const;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}
