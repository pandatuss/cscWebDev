import type { ReactNode } from "react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
}) {
  return (
    <section className="surface-wash border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-deep">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </section>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/60 px-6 py-14 text-center">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-56 animate-pulse rounded-2xl border border-border bg-secondary"
        />
      ))}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <h3 className="font-display text-lg font-semibold">We couldn't load this content</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {message ?? "Please refresh the page and try again."}
      </p>
    </div>
  );
}
