import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  Contact,
  GraduationCap,
  LayoutDashboard,
  School,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const dashboardNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck },
  { title: "Students", href: "/dashboard/students", icon: GraduationCap },
  { title: "Teachers", href: "/dashboard/teachers", icon: UserCheck },
  { title: "Parents", href: "/dashboard/parents", icon: Contact },
  { title: "Classes", href: "/dashboard/classes", icon: School },
  { title: "Team", href: "/dashboard/team", icon: Users },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];
