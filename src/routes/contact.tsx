import { safeUrl } from "@/lib/safe-url";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublicShell, PageHeader } from "@/components/site/public-shell";
import { settingsQuery } from "@/lib/queries";
import { submitContactMessage } from "@/lib/contact.functions";

const TURNSTILE_SITE_KEY = "0x4AAAAAAFR4fA2j2LxMlXNm";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void },
      ) => string;
      reset: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Computer Science Clique" },
      {
        name: "description",
        content:
          "Get in touch with the Computer Science Clique by email, social media, or our contact form.",
      },
      { property: "og:title", content: "Contact the Computer Science Clique" },
      {
        property: "og:description",
        content: "Reach the organization by email, social media, or our contact form.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        src: "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit",
        async: true,
        defer: true,
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data: settings } = useQuery(settingsQuery);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [startedAt] = useState(() => Date.now());
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const render = () => {
      if (!turnstileRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
      });
    };
    window.onTurnstileLoad = render;
    render();
    return () => {
      if (window.onTurnstileLoad === render) delete window.onTurnstileLoad;
    };
  }, []);

  const socials = (settings?.social_links ?? {}) as Record<string, string>;

  function validate() {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next["name"] = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next["email"] = "Please enter a valid email address.";
    if (form.subject.trim().length < 3) next["subject"] = "Please add a short subject.";
    if (form.message.trim().length < 10)
      next["message"] = "Your message should be at least 10 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    if (honeypot || Date.now() - startedAt < 3000) {
      toast.error("Your message could not be sent. Please try again in a moment.");
      return;
    }

    if (!turnstileToken) {
      toast.error("Please complete the security check before sending.");
      return;
    }

    setSending(true);
    try {
      await submitContactMessage({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          turnstileToken,
        },
      });
    } catch {
      setSending(false);
      setTurnstileToken("");
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
      toast.error("We couldn't send your message. Please try again.");
      return;
    }
    setSending(false);

    toast.success("Thank you! Your message has been sent.");
    setForm({ name: "", email: "", subject: "", message: "" });
    setTurnstileToken("");
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  }

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        description="Questions, suggestions, or partnership proposals — we'd love to hear from you."
      />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <div className="rounded-2xl game-panel p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold">Organization details</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <a
                  href={`mailto:${settings?.email ?? "csc@cvsu.edu.ph"}`}
                  className="text-primary-deep hover:underline"
                >
                  {settings?.email ?? "csc@cvsu.edu.ph"}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="text-muted-foreground">
                  {settings?.college ?? "Department of Computer Studies"}
                  <br />
                  {settings?.school ?? "Cavite State University - Imus Campus"}
                </span>
              </li>
              {settings?.office_location ? (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-muted-foreground">{settings.office_location}</span>
                </li>
              ) : null}
            </ul>
          </div>

          {Object.keys(socials).length ? (
            <div className="rounded-2xl game-panel p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold">Follow us</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {Object.entries(socials).map(([name, url]) => (
                  <li key={name}>
                    <a
                      href={safeUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-deep hover:underline"
                    >
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl game-panel p-6 shadow-card"
        >
          <h2 className="font-display text-lg font-semibold">Send us a message</h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                aria-invalid={Boolean(errors["name"])}
                aria-describedby={errors["name"] ? "name-error" : undefined}
                className="mt-1.5"
              />
              {errors["name"] ? (
                <p id="name-error" className="mt-1 text-xs text-destructive">
                  {errors["name"]}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-1">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                aria-invalid={Boolean(errors["email"])}
                aria-describedby={errors["email"] ? "email-error" : undefined}
                className="mt-1.5"
              />
              {errors["email"] ? (
                <p id="email-error" className="mt-1 text-xs text-destructive">
                  {errors["email"]}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(event) => setForm({ ...form, subject: event.target.value })}
                aria-invalid={Boolean(errors["subject"])}
                aria-describedby={errors["subject"] ? "subject-error" : undefined}
                className="mt-1.5"
              />
              {errors["subject"] ? (
                <p id="subject-error" className="mt-1 text-xs text-destructive">
                  {errors["subject"]}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={6}
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                aria-invalid={Boolean(errors["message"])}
                aria-describedby={errors["message"] ? "message-error" : undefined}
                className="mt-1.5"
              />
              {errors["message"] ? (
                <p id="message-error" className="mt-1 text-xs text-destructive">
                  {errors["message"]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="hidden" aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>

          <div ref={turnstileRef} className="mt-6" />

          <Button type="submit" size="lg" className="mt-6" disabled={sending || !turnstileToken}>
            {sending ? "Sending…" : "Send message"}
          </Button>
        </form>
      </div>
    </PublicShell>
  );
}