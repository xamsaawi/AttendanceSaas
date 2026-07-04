import Link from "next/link";

import { GlobalSearch } from "@/components/shared/global-search";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { env } from "@/config/env";

export function Navbar() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          {env.NEXT_PUBLIC_APP_NAME}
        </Link>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
