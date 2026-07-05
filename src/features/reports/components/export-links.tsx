import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ExportLinks({ baseHref, label }: { baseHref: string; label: string }) {
  const join = baseHref.includes("?") ? "&" : "?";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      {(["xlsx", "csv", "pdf"] as const).map((format) => (
        <Button
          key={format}
          variant="outline"
          size="sm"
          render={<a href={`${baseHref}${join}format=${format}`} />}
        >
          <DownloadIcon />
          {format.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
