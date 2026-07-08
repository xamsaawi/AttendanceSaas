"use client";

import { useRouter } from "next/navigation";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ImportSummary = {
  total: number;
  succeeded: number;
  failed: number;
  errors: { row: number; message: string }[];
  invitedEmails?: string[];
};

export function ImportExportBar({ entity, label }: { entity: "students" | "teachers" | "guardians"; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Please choose a file");
      return;
    }

    setIsImporting(true);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`/api/import/${entity}`, { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Import failed");
        return;
      }
      const result: ImportSummary = await response.json();
      setSummary(result);
      if (result.succeeded > 0) {
        toast.success(`Imported ${result.succeeded} of ${result.total} rows`);
        router.refresh();
      }
      if (result.failed > 0 && result.succeeded === 0) {
        toast.error(`All ${result.failed} rows failed`);
      }
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" render={<a href={`/api/export/${entity}`} />} nativeButton={false}>
        <DownloadIcon />
        Export
      </Button>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} type="button">
        <UploadIcon />
        Import
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSummary(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import {label}</DialogTitle>
            <DialogDescription>
              Upload an .xlsx file. Export first to get a file with the right columns. Rows with
              errors are skipped and reported below — the rest are imported.
            </DialogDescription>
          </DialogHeader>

          <Input ref={fileInputRef} type="file" accept=".xlsx" />

          {summary && (
            <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
              <p>
                {summary.succeeded} succeeded, {summary.failed} failed, out of {summary.total} rows.
              </p>
              {summary.invitedEmails && summary.invitedEmails.length > 0 && (
                <div className="space-y-1">
                  <p className="font-medium">
                    Invited — they can now sign in with Google using these addresses:
                  </p>
                  <ul className="space-y-1 font-mono">
                    {summary.invitedEmails.map((email) => (
                      <li key={email}>{email}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.errors.length > 0 && (
                <ul className="text-destructive space-y-1">
                  {summary.errors.slice(0, 50).map((err, i) => (
                    <li key={i}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                  {summary.errors.length > 50 && <li>...and {summary.errors.length - 50} more</li>}
                </ul>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" onClick={onImport} disabled={isImporting}>
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
