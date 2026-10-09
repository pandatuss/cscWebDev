import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_SETTINGS_COLUMNS =
  "id, organization_name, college, school, academic_year, established_date, email, office_location, social_links, tagline, about_text, mission, vision, objectives, created_at, updated_at";

export const settingsQuery = queryOptions({
  queryKey: ["organization-settings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("organization_settings")
      .select(PUBLIC_SETTINGS_COLUMNS)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? { ...data, phone: null as string | null } : data;
  },
});

export const adminSettingsQuery = queryOptions({
  queryKey: ["organization-settings", "admin"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("organization_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const publishedAnnouncementsQuery = queryOptions({
  queryKey: ["announcements", "published"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export function announcementQuery(slug: string) {
  return queryOptions({
    queryKey: ["announcement", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("slug", slug)
        .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export const publishedEventsQuery = queryOptions({
  queryKey: ["events", "published"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`)
      .order("event_date", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export function eventQuery(slug: string) {
  return queryOptions({
    queryKey: ["event", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export const publishedDocumentsQuery = queryOptions({
  queryKey: ["documents", "published"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("transparency_documents")
      .select("*")
      .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export function documentQuery(slug: string) {
  return queryOptions({
    queryKey: ["document", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transparency_documents")
        .select("*")
        .eq("slug", slug)
        .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export const activeOfficersQuery = queryOptions({
  queryKey: ["officers", "active"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("officers")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const activeFacultyQuery = queryOptions({
  queryKey: ["faculty", "active"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("faculty_members")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const allFacultyQuery = queryOptions({
  queryKey: ["admin", "faculty"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("faculty_members")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const allAnnouncementsQuery = queryOptions({
  queryKey: ["admin", "announcements"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const allEventsQuery = queryOptions({
  queryKey: ["admin", "events"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const allDocumentsQuery = queryOptions({
  queryKey: ["admin", "documents"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("transparency_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const allOfficersQuery = queryOptions({
  queryKey: ["admin", "officers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("officers")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const auditLogsQuery = queryOptions({
  queryKey: ["admin", "audit-logs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return data ?? [];
  },
});

export const contactMessagesQuery = queryOptions({
  queryKey: ["admin", "messages"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});
