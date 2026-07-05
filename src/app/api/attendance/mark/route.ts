import { NextResponse } from "next/server";

import { markAttendanceCore } from "@/features/attendance/actions";
import type { MarkAttendanceInput } from "@/lib/validations/attendance";

// A single stable JSON endpoint for marking attendance, used both by the
// live teacher-dashboard submit and by the offline replay queue — Server
// Actions can't be invoked reliably from a background replay loop, so this
// is the one call path both share (see src/features/attendance/offline/sync.ts).
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await markAttendanceCore(body as MarkAttendanceInput);

  if (result.success) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: result.error }, { status: result.code === "LOCKED" ? 423 : 400 });
}
