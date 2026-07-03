import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff className="text-muted-foreground size-12" />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        This page isn&apos;t available offline. Check your connection and try again.
      </p>
    </div>
  );
}
