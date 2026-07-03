import Link from "next/link";

import { env } from "@/config/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        {env.NEXT_PUBLIC_APP_NAME}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
