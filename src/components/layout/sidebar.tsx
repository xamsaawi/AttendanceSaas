import Link from "next/link";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { env } from "@/config/env";

export function Sidebar() {
  return (
    <aside className="bg-background hidden w-60 shrink-0 border-r md:block">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          {env.NEXT_PUBLIC_APP_NAME}
        </Link>
      </div>
      <SidebarNav />
    </aside>
  );
}
