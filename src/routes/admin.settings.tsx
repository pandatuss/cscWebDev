import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { submitChange, PENDING_MESSAGE } from "@/lib/change-requests";
import { Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminSettingsQuery as settingsQuery } from "@/lib/queries";
import { logAction } from "@/hooks/use-csc-auth";

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Org Info & Page Content — CSC Admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Restricted Computer Science Clique administration: org info & page content." },
      { property: "og:title", content: "Org Info & Page Content — CSC Admin" },
      { property: "og:description", content: "Restricted Computer Science Clique administration: org info & page content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSettings,
});

const SOCIAL_KEYS = ["facebook"] as const;

type Objective = { title: string; description: string };

function AdminSettings() {
  const queryClient = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [fields, setFields] = useState({
    organization_name: "",
    college: "",
    school: "",
    academic_year: "",
    established_date: "",
    email: "",
    phone: "",
    office_location: "",
  });
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFields({
      organization_name: data.organization_name ?? "",
      college: data.college ?? "",
      school: data.school ?? "",
      academic_year: data.academic_year ?? "",
      established_date: data.established_date ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      office_location: data.office_location ?? "",
    });
    const raw = (data.social_links ?? {}) as Record<string, unknown>;
    const next: Record<string, string> = {};
    for (const key of SOCIAL_KEYS) next[key] = String(raw[key] ?? "");
    setSocials(next);
    setTagline(data.tagline ?? "");
    setAbout(data.about_text ?? "");
    setMission(data.mission ?? "");
    setVision(data.vision ?? "");
    const rawObjectives = Array.isArray(data.objectives) ? data.objectives : [];
    setObjectives(
      rawObjectives.map((item) => {
        const obj = (item ?? {}) as Record<string, unknown>;
        return {
          title: String(obj["title"] ?? ""),
          description: String(obj["description"] ?? ""),
        };
      }),
    );
  }, [data]);

  async function save() {
    if (!data) return;
    setSaving(true);
    const cleanSocials = Object.fromEntries(
      Object.entries(socials).filter(([, value]) => value.trim()),
    );
    const { error, pending } = await submitChange(
      "organization_settings",
      "update",
      data.id,
      {
        ...fields,
        social_links: cleanSocials,
        tagline,
        about_text: about,
        mission,
        vision,
        objectives: objectives.filter((o) => o.title.trim()),
      },
      "Edit org info and page content",
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (pending) {
      toast.success(PENDING_MESSAGE);
      return;
    }
    await logAction("update", "settings", data.id);
    toast.success("Organization settings saved.");
    void queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
  }

  return (
    <AdminShell
      title="Org Info & Page Content"
      description="Official details, contact information, and homepage text"
      actions={
        <Button onClick={() => void save()} disabled={saving || !data}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl game-panel p-6 shadow-card">
          <h2 className="font-display text-base font-semibold">Organization information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["organization_name", "Organization name"],
                ["college", "Department"],
                ["school", "School"],
                ["academic_year", "Academic year"],
                ["established_date", "Established"],
                ["email", "Official email"],
                ["phone", "Phone"],
                ["office_location", "Office location"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className={key === "office_location" ? "sm:col-span-2" : undefined}>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  value={fields[key]}
                  onChange={(event) => setFields({ ...fields, [key]: event.target.value })}
                  className="mt-1.5"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl game-panel p-6 shadow-card">
          <h2 className="font-display text-base font-semibold">Social links</h2>
          <div className="mt-4 space-y-4">
            {SOCIAL_KEYS.map((key) => (
              <div key={key}>
                <Label htmlFor={`social-${key}`} className="capitalize">
                  {key}
                </Label>
                <Input
                  id={`social-${key}`}
                  value={socials[key] ?? ""}
                  placeholder="https://…"
                  onChange={(event) => setSocials({ ...socials, [key]: event.target.value })}
                  className="mt-1.5"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl game-panel p-6 shadow-card">
          <h2 className="font-display text-base font-semibold">Introduction</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="about">Who we are</Label>
              <Textarea
                id="about"
                rows={7}
                value={about}
                onChange={(event) => setAbout(event.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl game-panel p-6 shadow-card">
          <h2 className="font-display text-base font-semibold">Mission and vision</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="mission">Mission</Label>
              <Textarea
                id="mission"
                rows={5}
                value={mission}
                onChange={(event) => setMission(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="vision">Vision</Label>
              <Textarea
                id="vision"
                rows={5}
                value={vision}
                onChange={(event) => setVision(event.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl game-panel p-6 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Objectives</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setObjectives([...objectives, { title: "", description: "" }])}
            >
              <Plus className="mr-1 size-4" /> Add objective
            </Button>
          </div>
          <div className="mt-4 space-y-4">
            {objectives.map((item, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <Input
                  aria-label={`Objective ${index + 1} title`}
                  placeholder="Title"
                  value={item.title}
                  onChange={(event) => {
                    const next = [...objectives];
                    next[index] = { ...item, title: event.target.value };
                    setObjectives(next);
                  }}
                />
                <Input
                  aria-label={`Objective ${index + 1} description`}
                  placeholder="Description"
                  value={item.description}
                  onChange={(event) => {
                    const next = [...objectives];
                    next[index] = { ...item, description: event.target.value };
                    setObjectives(next);
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove objective"
                  onClick={() => setObjectives(objectives.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            {!objectives.length ? (
              <p className="text-sm text-muted-foreground">No objectives added yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
