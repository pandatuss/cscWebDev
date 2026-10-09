import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CscLogo } from "@/components/site/csc-logo";

const links = [
  { to: "/", label: "Home" },
  { to: "/announcements", label: "Announcements" },
  { to: "/events", label: "Events" },
  { to: "/transparency", label: "Transparency" },
  { to: "/officers", label: "Officers" },
  { to: "/about", label: "About" },
  { to: "/faculty", label: "Faculty" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Computer Science Clique home">
          <CscLogo className="size-10" />
          <span className="leading-tight">
            <span className="block font-display text-base font-bold">Computer Science Clique</span>
            <span className="block text-xs text-muted-foreground">CvSU Imus Campus</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              className="relative rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[status=active]:text-primary-deep data-[status=active]:after:opacity-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {open ? (
        <nav className="border-t border-border bg-background px-4 pb-4 lg:hidden" aria-label="Mobile">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
