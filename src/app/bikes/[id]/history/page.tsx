import React from "react";
import { notFound } from "next/navigation";
import { getBikeById, getBikeOdometerEntries } from "@/app/actions/bikes";
import { getBikeServiceEvents } from "@/app/actions/maintenance";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { formatDateCs, formatKm, formatMinutes, formatCzk, t } from "@/lib/i18n";
import { 
  History, 
  Sparkles, 
  Wrench, 
  SlidersHorizontal, 
  Calendar, 
  ArrowRight, 
  Layers 
} from "lucide-react";

interface BikeHistoryPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function BikeHistoryPage({ params }: BikeHistoryPageProps) {
  const { id } = await params;
  const bike = await getBikeById(id);
  if (!bike) notFound();

  // Load all historical installations on this bike
  const installations = await db
    .select({
      installation: schema.componentInstallations,
      component: schema.components,
      category: schema.componentCategories,
    })
    .from(schema.componentInstallations)
    .innerJoin(schema.components, eq(schema.componentInstallations.componentId, schema.components.id))
    .innerJoin(schema.componentCategories, eq(schema.components.categoryId, schema.componentCategories.id))
    .where(eq(schema.componentInstallations.bikeId, id))
    .orderBy(sql`${schema.componentInstallations.installedAt} DESC`);

  const serviceEvents = await getBikeServiceEvents(id);
  const odometerEntries = await getBikeOdometerEntries(id);

  // Group into unified chronological timeline
  const timelineItems: any[] = [];

  for (const inst of installations) {
    timelineItems.push({
      date: new Date(inst.installation.installedAt),
      type: "INSTALLATION",
      title: `Montáž: ${inst.component.manufacturer} ${inst.component.model}`,
      subtitle: `${inst.category.nameCs} • při ${formatKm(inst.installation.installedBikeKm)}`,
      badge: "Komponent",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      icon: Layers,
    });

    if (inst.installation.removedAt) {
      timelineItems.push({
        date: new Date(inst.installation.removedAt),
        type: "REMOVAL",
        title: `Demontáž: ${inst.component.manufacturer} ${inst.component.model}`,
        subtitle: `Ukončení montáže při ${formatKm(inst.installation.removedBikeKm)}`,
        badge: "Demontáž",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
        icon: Layers,
      });
    }
  }

  for (const item of serviceEvents) {
    timelineItems.push({
      date: new Date(item.event.serviceDate),
      type: "SERVICE",
      title: `Servis: ${item.event.name}`,
      subtitle: `${item.event.serviceProvider || "Svépomocí"} • ${formatCzk(Number(item.event.partsCost) + Number(item.event.laborCost))}`,
      badge: "Servis",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: Wrench,
    });
  }

  for (const odo of odometerEntries) {
    if (odo.entryType === "INITIAL") {
      timelineItems.push({
        date: new Date(odo.entryDate),
        type: "INITIAL",
        title: `Výchozí stav počítadla: ${formatKm(odo.resultingKm)}`,
        subtitle: `${formatMinutes(odo.resultingMinutes)} • ${odo.note || "Zavedení kola do garáže"}`,
        badge: "Výchozí stav",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
        icon: SlidersHorizontal,
      });
    } else if (odo.entryType === "SNAPSHOT" || odo.entryType === "RIDE") {
      const deltaKmNum = Number(odo.deltaKm);
      const isDeltaPositive = deltaKmNum >= 0;
      const deltaKmText = isDeltaPositive ? `+${formatKm(odo.deltaKm)}` : formatKm(odo.deltaKm);
      const deltaMinText = odo.deltaMinutes >= 0 ? `+${formatMinutes(odo.deltaMinutes)}` : `-${formatMinutes(Math.abs(odo.deltaMinutes))}`;

      timelineItems.push({
        date: new Date(odo.entryDate),
        type: "SNAPSHOT",
        title: `Odečet počítadla: ${formatKm(odo.resultingKm)} (${deltaKmText})`,
        subtitle: `${formatMinutes(odo.resultingMinutes)} (${deltaMinText})${odo.note ? ` • ${odo.note}` : ""}`,
        badge: "Stav počítadla",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: SlidersHorizontal,
      });
    } else if (odo.entryType === "CORRECTION") {
      timelineItems.push({
        date: new Date(odo.entryDate),
        type: "CORRECTION",
        title: `Korekce počítadla na ${formatKm(odo.resultingKm)}`,
        subtitle: `${formatMinutes(odo.resultingMinutes)} • ${odo.note || "Manuální oprava"}`,
        badge: "Korekce",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        icon: History,
      });
    }
  }

  // Sort descending by date
  timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-8 animate-fade-in">
      <BikeHeader bike={bike} />

      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Časová osa a životopis kola
        </h2>
        <p className="text-xs text-slate-500">
          Kompletní chronologie od nákupu, přes upgrady dílů, servisní zásahy až po odečty stavu tachometru
        </p>
      </div>

      {/* TIMELINE */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {timelineItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="relative group">
              {/* Dot */}
              <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-300 group-hover:border-blue-600 transition-colors flex items-center justify-center text-slate-500 group-hover:text-blue-600 shadow-sm">
                <Icon className="w-3 h-3" />
              </div>

              {/* Card */}
              <div className="bg-white border border-slate-200 hover:border-slate-300 p-4 rounded-xl transition-all shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {formatDateCs(item.date)}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
