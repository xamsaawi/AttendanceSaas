import Link from "next/link";

import { Button } from "@/components/ui/button";
import { env } from "@/config/env";

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{env.NEXT_PUBLIC_APP_NAME}</h1>
      <p className="text-muted-foreground max-w-md">
        Track and manage team attendance with ease.
      </p>
      <div className="flex gap-3">
        <Button render={<Link href="/login" />} nativeButton={false}>
          Sign in
        </Button>
      </div>
    </div>
  );
}
