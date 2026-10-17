import {
  Warehouse,
  Layers,
  Wrench,
  Coins,
  BarChart3,
  Settings,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/i18n";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown directly in the mobile bottom bar; the rest live behind "Více" (the drawer). */
  primary: boolean;
}

// Shared by the sidebar and the mobile bottom bar so both navigations stay in sync
export const NAV_ITEMS: NavItem[] = [
  { href: "/garage", label: t("nav.garage"), icon: Warehouse, primary: true },
  { href: "/components", label: t("nav.components"), icon: Layers, primary: true },
  { href: "/maintenance", label: t("nav.maintenance"), icon: Wrench, primary: true },
  { href: "/finances", label: t("nav.finances"), icon: Coins, primary: true },
  { href: "/statistics", label: t("nav.statistics"), icon: BarChart3, primary: false },
  { href: "/lists", label: t("nav.lists"), icon: ListChecks, primary: false },
  { href: "/settings", label: t("nav.settings"), icon: Settings, primary: false },
];

export const isNavItemActive = (pathname: string, href: string): boolean => {
  if (href === "/garage") {
    return pathname === "/" || pathname === "/garage" || pathname.startsWith("/bikes");
  }
  return pathname.startsWith(href);
};

export const countOverdueSchedules = (
  statuses: Array<{ schedule?: { isActive: boolean }; status?: { urgency: string } }>
): number => statuses.filter((s) => s.schedule?.isActive && s.status?.urgency === "OVERDUE").length;
