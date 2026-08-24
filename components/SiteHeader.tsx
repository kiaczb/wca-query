import { FaSignOutAlt } from "react-icons/fa";

import SpeedcubingFullAnimatedSVG from "./svgs/SpeedcubingFullAnimatedSVG";
import Button from "./ui/Button";
import type { PublicSession } from "@/lib/session";

export default function SiteHeader({ user }: { user: PublicSession | null }) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-line bg-white/85 backdrop-blur-md dark:bg-canvas/85">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-12">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href="https://www.speedcubinghungary.hu"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Speedcubing Hungary — főoldal"
              className="shrink-0 rounded-control"
            >
              <SpeedcubingFullAnimatedSVG animated={false} maxWidth={150} />
            </a>

            <span
              aria-hidden="true"
              className="hidden h-6 w-px shrink-0 bg-line-strong sm:block"
            />

            <p className="hidden truncate text-sm font-semibold tracking-tight text-foreground sm:block">
              WCA Statisztika AI
            </p>
          </div>

          {user ? (
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden text-sm text-muted-foreground md:inline">
                {user.name}
                {user.wcaId ? (
                  <span className="ml-2 font-mono text-xs text-subtle-foreground">
                    {user.wcaId}
                  </span>
                ) : null}
              </span>
              <form action="/api/auth/logout" method="post">
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  icon={<FaSignOutAlt className="h-3.5 w-3.5" />}
                >
                  Kilépés
                </Button>
              </form>
            </div>
          ) : (
            <Button href="/api/auth/login" size="sm" className="shrink-0">
              Bejelentkezés
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
