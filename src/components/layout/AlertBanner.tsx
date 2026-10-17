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
    <div className="panel panel-error flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
        <div>
          <span className="font-bold">
            Servis po termínu ({overdue.length}):
          </span>{" "}
          <strong>{bike?.name || "Kolo"}</strong> – {firstOverdue.schedule?.name} ({firstOverdue.status?.summaryTextCs}).
        </div>
      </div>

      <Link
        href="/maintenance"
        className="btn-secondary btn-secondary-danger btn-sm self-start sm:self-auto shrink-0"
      >
        <Wrench className="w-3.5 h-3.5" />
        <span>Vyřešit servis</span>
      </Link>
    </div>
  );
};

export default AlertBanner;
