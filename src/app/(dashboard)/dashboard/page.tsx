import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logout } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome{user?.email ? `, ${user.email}` : ""}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          This is the foundation dashboard. Attendance features land next.
        </CardContent>
      </Card>
    </div>
  );
}
