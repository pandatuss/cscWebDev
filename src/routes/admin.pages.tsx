import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/pages")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/admin/settings", replace: true });
  },
  component: () => null,
});
