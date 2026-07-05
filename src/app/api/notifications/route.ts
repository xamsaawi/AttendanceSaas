import { NextResponse } from "next/server";

import { listNotificationsForCurrentUser } from "@/features/notifications/queries";
import { getCurrentMembership } from "@/features/organizations/queries";

export async function GET() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await listNotificationsForCurrentUser();
  return NextResponse.json(result);
}
