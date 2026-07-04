import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteTeacherDialog } from "@/features/team/components/invite-teacher-dialog";
import { MemberActions } from "@/features/team/components/member-actions";
import { listMembers } from "@/features/team/queries";
import { getCurrentMembership } from "@/features/organizations/queries";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
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
  const members = await listMembers(membership.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        {isAdmin && <InviteTeacherDialog />}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className={isAdmin ? "text-right" : undefined}>
                  {isAdmin ? "Actions" : "Role"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>{member.fullName ?? "—"}</TableCell>
                  <TableCell>{member.email ?? "—"}</TableCell>
                  <TableCell className={isAdmin ? "text-right" : undefined}>
                    {isAdmin ? (
                      <MemberActions userId={member.userId} role={member.role} />
                    ) : (
                      <Badge variant="outline">{member.role}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
