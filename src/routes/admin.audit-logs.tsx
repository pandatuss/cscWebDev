import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import { auditLogsQuery } from "@/lib/queries";
import { formatDate } from "@/lib/csc-types";

export const Route = createFileRoute("/admin/audit-logs")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Audit logs — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: audit logs." },
      { property: "og:title", content: "Audit logs — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: audit logs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAuditLogs,
});

function AdminAuditLogs() {
  const { data, isPending } = useQuery(auditLogsQuery);
  const [term, setTerm] = useState("");

  const rows = (data ?? []).filter((log) => {
    if (!term.trim()) return true;
    const haystack = `${log.user_email ?? ""} ${log.action} ${log.entity_type ?? ""}`.toLowerCase();
    return haystack.includes(term.trim().toLowerCase());
  });

  return (
    <AdminShell
      requireSuperAdmin
      title="Audit logs"
      description="Every administrative action recorded with who, what, and when"
    >
      <div className="mb-4 max-w-sm">
        <Input
          aria-label="Search audit logs"
          placeholder="Search by administrator, action, or record"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl game-panel shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Administrator</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(log.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(log.created_at).toLocaleTimeString("en-PH", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">{log.user_email ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{log.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.entity_type ?? "—"}
                    {log.entity_id ? (
                      <span className="block text-xs">{log.entity_id.slice(0, 8)}…</span>
                    ) : null}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">
                    {JSON.stringify(log.metadata)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No matching activity.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
