import { env } from "@/config/env";

export function Footer() {
  return (
    <footer className="border-t px-4 py-6">
      <p className="text-muted-foreground text-center text-xs">
        &copy; {new Date().getFullYear()} {env.NEXT_PUBLIC_APP_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
