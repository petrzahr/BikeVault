"use client";

import React from "react";
import Link from "next/link";
import { useVault } from "@/context/VaultContext";
import { AlertTriangle, Wrench } from "lucide-react";

export const AlertBanner: React.FC = () => {
  const { getServiceScheduleStatuses, data } = useVault();
  const statuses = getServiceScheduleStatuses();
  const overdue = statuses.filter(
    (s: { schedule?: { isActive: boolean }; status?: { urgency: string } }) =>
      s.schedule?.isActive && s.status?.urgency === "OVERDUE"
  );

  if (overdue.length === 0) return null;

  const firstOverdue = overdue[0];
  const bike = data.bikes.find((b) => b.id === firstOverdue.schedule?.bikeId);

  return (
    <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl border bg-rose-50/90 border-rose-200/80 text-rose-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <span className="font-bold">
            Upozornění – Vyžadován servis ({overdue.length}):
          </span>{" "}
          Kolo <strong>{bike?.name || "Kolo"}</strong> má překročený servisní interval u položky{" "}
          <strong>{firstOverdue.schedule?.name}</strong> ({firstOverdue.status?.summaryTextCs}).
        </div>
      </div>

      <Link
        href="/maintenance"
        className="self-start sm:self-auto px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-100/80 hover:bg-rose-200 rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
      >
        <Wrench className="w-3.5 h-3.5" />
        <span>Přejít do servisu</span>
      </Link>
    </div>
  );
};

export default AlertBanner;
