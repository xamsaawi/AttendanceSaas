import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { getCurrentMembership } from "@/features/organizations/queries";
import { GuardiansSection } from "@/features/parents/components/guardians-section";
import { listGuardians } from "@/features/parents/queries";
import { listStudentOptions } from "@/features/students/queries";

export const metadata: Metadata = { title: "Parents" };

export default async function ParentsPage() {
  const membership = await getCurrentMembership();

  if (!membership) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          You&apos;re not part of a school yet.
        </CardContent>
      </Card>
    );
  }

  const isAdmin = membership.role === "owner" || membership.role === "admin";
  const [guardians, studentOptions] = await Promise.all([
    listGuardians(membership.organizationId),
    listStudentOptions(membership.organizationId),
  ]);

  return <GuardiansSection guardians={guardians} studentOptions={studentOptions} isAdmin={isAdmin} />;
}
