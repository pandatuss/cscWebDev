import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { CscLogo } from "@/components/site/csc-logo";

export function Footer() {
  const { data: settings } = useQuery(settingsQuery);

  return (
    <footer className="mt-20 border-t bg-primary-soft text-foreground [&_h2]:text-primary-deep [&_a:hover]:text-primary-deep">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <CscLogo className="size-10" />
            <span className="font-display text-base font-bold">
              {settings?.organization_name ?? "Computer Science Clique"}
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            {settings?.tagline ??
              "Building a connected, transparent, and collaborative community for Computer Science students."}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Explore</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/about" className="hover:text-foreground">
                About the organization
              </Link>
            </li>
            <li>
              <Link to="/announcements" className="hover:text-foreground">
                Announcements
              </Link>
            </li>
            <li>
              <Link to="/events" className="hover:text-foreground">
                Events
              </Link>
            </li>
            <li>
              <Link to="/transparency" className="hover:text-foreground">
                Transparency portal
              </Link>
            </li>
            <li>
              <Link to="/officers" className="hover:text-foreground">
                Officers
              </Link>
            </li>
            <li>
              <Link to="/faculty" className="hover:text-foreground">
                Faculty
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Contact</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>{settings?.email ?? "csc@cvsu.edu.ph"}</li>
            <li>{settings?.college ?? "Department of Computer Studies"}</li>
            <li>{settings?.school ?? "Cavite State University - Imus Campus"}</li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Send us a message
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} {settings?.organization_name ?? "Computer Science Clique"}.
        {" "}
        {settings?.academic_year ? `A.Y. ${settings.academic_year}` : "A.Y. 2026-2027"}. All rights reserved.
      </div>
    </footer>
  );
}
