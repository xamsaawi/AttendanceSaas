import Link from "next/link";

import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalSearch } from "@/components/shared/global-search";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { env } from "@/config/env";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

export function Navbar() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link href="/" className="font-semibold tracking-tight">
            {env.NEXT_PUBLIC_APP_NAME}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
