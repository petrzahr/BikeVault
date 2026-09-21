"use client";

import React, { use, useState } from "react";
import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { formatDateCs, formatKm, formatMinutes, formatCzk, t } from "@/lib/i18n";
import { 
  History, 
  Sparkles, 
  Wrench, 
  SlidersHorizontal, 
  Calendar, 
  ArrowRight, 
  Layers,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/lib/ui";

interface BikeHistoryPageProps {
  params: Promise<{ id: string }>;
}

export default function BikeHistoryPage({ params }: BikeHistoryPageProps) {
  const { id } = use(params);
  const { data, getBike, getBikeServiceEvents, deleteOdometerEntry, deleteServiceEvent } = useVault();
  const { toast } = useFeedback();
  const bike = getBike(id);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "SERVICE" | "ODOMETER";
    id: string;
    label: string;
  } | null>(null);

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "SERVICE") {
      deleteServiceEvent(pendingDelete.id);
    } else {
      const res = deleteOdometerEntry(pendingDelete.id);
      if (!res.success) toast(res.error || "Záznam nelze smazat.", "error");
    }
  };

  if (!bike) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-2">Kolo nenalezeno</h2>
        <Link href="/garage" className="text-navy-600 hover:underline text-xs font-semibold">
          Zpět do Garáže
        </Link>
      </div>
    );
  }

  // Load all historical installations on this bike
  const installations = data.componentInstallations
    .filter((i) => i.bikeId === id)
    .sort((a, b) => new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime());

  const serviceEvents = getBikeServiceEvents(id);
  const odometerEntries = data.odometerEntries.filter((o) => o.bikeId === id);
  // Only the most recent non-initial odometer entry can be deleted (later entries build on earlier ones)
  const latestOdometerEntry = [...odometerEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const deletableOdometerId =
    latestOdometerEntry && latestOdometerEntry.entryType !== "INITIAL" ? latestOdometerEntry.id : null;

  // Group into unified chronological timeline
  const timelineItems: any[] = [];

  for (const inst of installations) {
    const comp = data.components.find((c) => c.id === inst.componentId);
    const cat = data.categories.find((c) => c.id === comp?.categoryId);
    const compName = comp ? `${comp.manufacturer} ${comp.model}` : "Komponent";
    const catName = cat?.nameCs || "";

    timelineItems.push({
      date: new Date(inst.installedAt),
      type: "INSTALLATION",
      title: `Montáž: ${compName}`,
      subtitle: `${catName} • při ${formatKm(inst.installedBikeKm)}`,
      badge: "Komponent",
      badgeColor: "bg-navy-50 text-navy-700 border-navy-200/80",
      icon: Layers,
    });

    if (inst.removedAt) {
      timelineItems.push({
        date: new Date(inst.removedAt),
        type: "REMOVAL",
        title: `Demontáž: ${compName}`,
        subtitle: `Ukončení montáže při ${formatKm(inst.removedBikeKm || 0)}`,
        badge: "Demontáž",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200/80",
        icon: Layers,
      });
    }
  }

  for (const item of serviceEvents) {
    timelineItems.push({
      date: new Date(item.serviceDate),
      type: "SERVICE",
      title: `Servis: ${item.description}`,
      subtitle: `${item.shopName || (item.performedBy === "SELF" ? "Svépomocí" : "Servis")} • ${formatCzk(Number(item.totalPrice || 0))}`,
      badge: "Servis",
      badgeColor: "bg-navy-50 text-navy-700 border-navy-200/80",
      icon: Wrench,
      onDelete: () => setPendingDelete({ kind: "SERVICE", id: item.id, label: `servisní záznam „${item.description}“ včetně navázané platby` }),
    });
  }

  for (const odo of odometerEntries) {
    const isStrava = odo.source === "STRAVA";
    const sourceLabel = isStrava ? "Strava" : "Ručně";

    if (odo.entryType === "INITIAL") {
      timelineItems.push({
        date: new Date(odo.entryDate),
        type: "INITIAL",
        title: `Výchozí stav počítadla: ${formatKm(odo.resultingKm)}`,
        subtitle: `${formatMinutes(odo.resultingMinutes)} • ${sourceLabel} • ${odo.note || "Zavedení kola do garáže"}`,
        badge: `Výchozí stav • ${sourceLabel}`,
        badgeColor: isStrava
          ? "bg-navy-50 text-navy-700 border-navy-200/80"
          : "bg-slate-100 text-slate-700 border-slate-200/80",
        icon: SlidersHorizontal,
      });
    } else if (odo.entryType === "RIDE") {
      const deltaKmNum = Number(odo.deltaKm);
      const isDeltaPositive = deltaKmNum >= 0;
      const deltaKmText = isDeltaPositive ? `+${formatKm(odo.deltaKm)}` : formatKm(odo.deltaKm);
      const deltaMinText = odo.deltaMinutes >= 0 ? `+${formatMinutes(odo.deltaMinutes)}` : `-${formatMinutes(Math.abs(odo.deltaMinutes))}`;

      timelineItems.push({
        date: new Date(odo.entryDate),
        type: "SNAPSHOT",
        title: `Odečet počítadla: ${formatKm(odo.resultingKm)} (${deltaKmText})`,
        subtitle: `${formatMinutes(odo.resultingMinutes)} (${deltaMinText}) • ${sourceLabel}${odo.note ? ` • ${odo.note}` : ""}`,
        badge: isStrava ? "Tachometr • Strava" : "Tachometr • Ručně",
        badgeColor: isStrava
          ? "bg-navy-50 text-navy-700 border-navy-200/80"
          : "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        icon: SlidersHorizontal,
        onDelete: odo.id === deletableOdometerId
          ? () => setPendingDelete({ kind: "ODOMETER", id: odo.id, label: `odečet počítadla ${formatKm(odo.resultingKm)} (nájezd se vrátí na předchozí stav)` })
          : undefined,
      });
    } else if (odo.entryType === "CORRECTION") {
      timelineItems.push({
        date: new Date(odo.entryDate),
        type: "CORRECTION",
        title: `Korekce počítadla na ${formatKm(odo.resultingKm)}`,
        subtitle: `${formatMinutes(odo.resultingMinutes)} • ${sourceLabel} • ${odo.note || "Manuální oprava"}`,
        badge: `Korekce • ${sourceLabel}`,
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200/80",
        icon: History,
        onDelete: odo.id === deletableOdometerId
          ? () => setPendingDelete({ kind: "ODOMETER", id: odo.id, label: `korekci počítadla na ${formatKm(odo.resultingKm)} (nájezd se vrátí na předchozí stav)` })
          : undefined,
      });
    }
  }

  // Sort descending by date
  timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <BikeHeader bike={bike} />

      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Časová osa a životopis kola
          </h2>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {timelineItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="relative group">
              {/* Dot */}
              <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-300 group-hover:border-navy-600 transition-colors flex items-center justify-center text-slate-500 group-hover:text-navy-600 shadow-sm">
                <Icon className="w-3 h-3" />
              </div>

              {/* Card */}
              <div className="bg-white border border-slate-200/80 hover:border-slate-300 p-4 sm:p-5 rounded-2xl transition-all shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">
                    {formatDateCs(item.date)}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {item.subtitle}
                </p>
                {item.onDelete && (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={item.onDelete}
                      className={buttonClass("ghost", "sm", "hover:text-rose-600 hover:bg-rose-50")}
                      title="Smazat záznam"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Smazat</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmationModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Smazat záznam"
        message={`Opravdu chcete smazat ${pendingDelete?.label ?? "záznam"}? Tuto akci nelze vrátit zpět.`}
        confirmText="Smazat"
        isDestructive
      />
    </div>
  );
}
