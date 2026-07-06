"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendAttendanceReportToParents } from "@/features/attendance/actions";
import type { AttendanceSessionType } from "@/types/database";

const DEFAULT_TEMPLATE =
  "Hi {guardianName}, this is to inform you that {studentName} was marked {status} on {date}.";

export function SendParentReportDialog({
  classId,
  sessionDate,
  sessionType,
  markedCount,
}: {
  classId: string;
  sessionDate: string;
  sessionType: AttendanceSessionType;
  markedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_TEMPLATE);
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    setIsSending(true);
    const result = await sendAttendanceReportToParents({
      classId,
      sessionDate,
      sessionType,
      messageTemplate: message,
    });
    setIsSending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    const skipped = result.skippedNoGuardian + result.skippedNoPhone;
    if (result.disabled > 0) {
      toast.warning(
        `WhatsApp isn't configured for this school, so nothing was actually delivered (${result.disabled} logged as disabled). Set it up in Settings > Integrations.`,
      );
    } else {
      toast.success(
        `Sent to ${result.sent} guardian${result.sent === 1 ? "" : "s"}` +
          (result.failed > 0 ? `, ${result.failed} failed` : "") +
          (skipped > 0 ? `, ${skipped} skipped (no primary guardian or phone on file)` : ""),
      );
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" disabled={markedCount === 0} />}>
        Send report to parents
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send attendance report to parents</DialogTitle>
          <DialogDescription>
            Sends a WhatsApp message to the primary guardian of each of the {markedCount} marked
            student{markedCount === 1 ? "" : "s"} in this session. Use {"{studentName}"},{" "}
            {"{guardianName}"}, {"{status}"}, and {"{date}"} — they&apos;re replaced per student.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="parent-report-message">Message</Label>
          <Textarea
            id="parent-report-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
