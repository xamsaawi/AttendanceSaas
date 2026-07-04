import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassesSection } from "@/features/classes/components/classes-section";
import { GradesSection } from "@/features/classes/components/grades-section";
import { SectionsSection } from "@/features/classes/components/sections-section";
import { listClasses, listGrades, listSections } from "@/features/classes/queries";
import { getCurrentMembership } from "@/features/organizations/queries";
import { listAcademicYears } from "@/features/academic/queries";
import { listMembers } from "@/features/team/queries";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage() {
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
  const [grades, sections, classes, academicYears, members] = await Promise.all([
    listGrades(membership.organizationId),
    listSections(membership.organizationId),
    listClasses(membership.organizationId),
    listAcademicYears(membership.organizationId),
    listMembers(membership.organizationId),
  ]);

  const teacherOptions = members.map((m) => ({
    id: m.userId,
    name: m.fullName ?? m.email ?? "Unnamed",
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>

      <Tabs defaultValue="classes">
        <TabsList>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>
        <TabsContent value="classes" className="space-y-6 pt-4">
          <ClassesSection
            classes={classes}
            grades={grades}
            sections={sections}
            academicYears={academicYears}
            teachers={teacherOptions}
            isAdmin={isAdmin}
          />
        </TabsContent>
        <TabsContent value="grades" className="space-y-6 pt-4">
          <GradesSection grades={grades} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="sections" className="space-y-6 pt-4">
          <SectionsSection sections={sections} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
