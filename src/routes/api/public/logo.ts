import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/logo")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("csc-media")
          .download("branding/csc-logo.png");
        if (error || !data) return new Response("Logo not found", { status: 404 });
        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
