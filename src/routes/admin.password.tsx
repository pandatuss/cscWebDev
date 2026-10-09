import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/password")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/admin/profile", replace: true });
  },
  component: () => null,
});
