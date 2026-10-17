"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, type LucideIcon } from "lucide-react";
import { useVault } from "@/context/VaultContext";
import { cn } from "@/lib/ui";
import { NAV_ITEMS, isNavItemActive, countOverdueSchedules } from "./navItems";

interface MobileNavProps {
  drawerOpen: boolean;
  onOpenDrawer: () => void;
}

const PRIMARY_ITEMS = NAV_ITEMS.filter((item) => item.primary);
const SECONDARY_ITEMS = NAV_ITEMS.filter((item) => !item.primary);

const NavCell: React.FC<{ icon: LucideIcon; label: string; active: boolean; badge?: number }> = ({
  icon: Icon,
  label,
  active,
  badge,
}) => (
  <>
    <span
      className={cn(
        "relative flex items-center justify-center w-12 h-7 rounded-md transition-colors",
        active ? "bg-signal-500 text-slate-900" : "text-white/60"
      )}
    >
      <Icon className="w-5 h-5" />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-xs leading-4 font-bold tabular-nums text-center ring-2 ring-slate-900">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </span>
    <span className={cn("text-xs font-semibold leading-4 truncate max-w-full", active ? "text-white" : "text-white/60")}>
      {label}
    </span>
  </>
);

/** Phone-only bottom tab bar: the four main sections within thumb reach, the rest behind "Více" (the drawer). */
export const MobileNav: React.FC<MobileNavProps> = ({ drawerOpen, onOpenDrawer }) => {
  const pathname = usePathname();
  const { getServiceScheduleStatuses } = useVault();
  const overdueCount = countOverdueSchedules(getServiceScheduleStatuses());
  const moreActive = SECONDARY_ITEMS.some((item) => isNavItemActive(pathname, item.href));

  const cellClass =
    // flex-auto: width follows the label, so "Komponenty" fits on 320px phones without truncation
    "flex-auto min-w-0 flex flex-col items-center justify-center gap-1 h-14 px-0.5 select-none";

  return (
    <nav
      aria-label="Hlavní navigace"
      className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-slate-900 border-t border-white/10 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      <div className="flex items-stretch">
        {PRIMARY_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cellClass}
            >
              <NavCell
                icon={item.icon}
                label={item.label}
                active={active}
                badge={item.href === "/maintenance" ? overdueCount : undefined}
              />
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-expanded={drawerOpen}
          aria-controls="app-drawer"
          className={cellClass}
        >
          <NavCell icon={Menu} label="Více" active={moreActive} />
        </button>
      </div>
    </nav>
  );
};

export default MobileNav;
