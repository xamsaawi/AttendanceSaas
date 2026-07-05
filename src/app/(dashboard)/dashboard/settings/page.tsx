import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listAcademicYears,
  listHolidays,
  listTerms,
} from "@/features/academic/queries";
import { AcademicYearsSection } from "@/features/academic/components/academic-years-section";
import { HolidaysSection } from "@/features/academic/components/holidays-section";
import { TermsSection } from "@/features/academic/components/terms-section";
import { getCurrentMembership, getSchoolSettings } from "@/features/organizations/queries";
import { LogoUploadForm } from "@/features/organizations/components/logo-upload-form";
import { SchoolSettingsForm } from "@/features/organizations/components/school-settings-form";
import { getWhatsappSettings, listWhatsappMessages } from "@/features/whatsapp/queries";
import { WhatsappSettingsForm } from "@/features/whatsapp/components/whatsapp-settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
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
  const [settings, academicYears, terms, holidays, whatsappSettings, whatsappMessages] = await Promise.all([
    getSchoolSettings(membership.organizationId),
    listAcademicYears(membership.organizationId),
    listTerms(membership.organizationId),
    listHolidays(membership.organizationId),
    isAdmin ? getWhatsappSettings(membership.organizationId) : Promise.resolve(null),
    isAdmin ? listWhatsappMessages(membership.organizationId, 10) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {!isAdmin ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{membership.organizationName}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-1 text-sm">
              <p>Timezone: {settings.timezone}</p>
              {settings.address && <p>Address: {settings.address}</p>}
              {settings.phone && <p>Phone: {settings.phone}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Current academic year</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {academicYears.find((year) => year.is_current)?.name ?? "Not set"}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="academic">Academic calendar</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>School logo</CardTitle>
              </CardHeader>
              <CardContent>
                <LogoUploadForm logoUrl={settings.logo_url} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>School information</CardTitle>
              </CardHeader>
              <CardContent>
                <SchoolSettingsForm
                  defaultValues={{
                    name: membership.organizationName,
                    timezone: settings.timezone,
                    address: settings.address ?? "",
                    phone: settings.phone ?? "",
                    contactEmail: settings.contact_email ?? "",
                    workingDays: settings.working_days,
                    beforeBreakCutoff: settings.before_break_cutoff.slice(0, 5),
                    afterBreakCutoff: settings.after_break_cutoff.slice(0, 5),
                    attendanceLockGraceHours: settings.attendance_lock_grace_hours,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="academic" className="space-y-6 pt-4">
            <AcademicYearsSection years={academicYears} />
            <TermsSection terms={terms} academicYears={academicYears} />
            <HolidaysSection holidays={holidays} academicYears={academicYears} />
          </TabsContent>
          <TabsContent value="integrations" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp messaging</CardTitle>
              </CardHeader>
              <CardContent>
                {whatsappSettings && (
                  <WhatsappSettingsForm
                    defaultValues={{
                      provider: whatsappSettings.provider ?? "none",
                      accountSid: whatsappSettings.accountSid ?? "",
                      phoneNumberId: whatsappSettings.phoneNumberId ?? "",
                      accessToken: whatsappSettings.accessToken ?? "",
                      isEnabled: whatsappSettings.isEnabled,
                    }}
                    recentMessages={whatsappMessages}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
