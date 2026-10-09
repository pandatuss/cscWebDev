import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const STATIC_PATHS = [
  "/",
  "/about",
  "/announcements",
  "/events",
  "/transparency",
  "/officers",
  "/contact",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
                headers.delete("Authorization");
              }
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const [announcements, events, documents] = await Promise.all([
          supabase.from("announcements").select("slug, updated_at").or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`),
          supabase.from("events").select("slug, updated_at").or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`),
          supabase
            .from("transparency_documents")
            .select("slug, updated_at")
            .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`),
        ]);

        const dynamic = [
          ...(announcements.data ?? []).map((row) => ({
            loc: `/announcements/${row.slug}`,
            lastmod: row.updated_at,
          })),
          ...(events.data ?? []).map((row) => ({
            loc: `/events/${row.slug}`,
            lastmod: row.updated_at,
          })),
          ...(documents.data ?? []).map((row) => ({
            loc: `/transparency/${row.slug}`,
            lastmod: row.updated_at,
          })),
        ];

        const urls = [
          ...STATIC_PATHS.map((path) => `  <url><loc>${origin}${path}</loc></url>`),
          ...dynamic.map(
            (item) =>
              `  <url><loc>${origin}${item.loc}</loc><lastmod>${new Date(item.lastmod).toISOString()}</lastmod></url>`,
          ),
        ].join("\n");

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
          { headers: { "Content-Type": "application/xml" } },
        );
      },
    },
  },
});
