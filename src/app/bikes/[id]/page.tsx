"use client";

import React, { use } from "react";
import { notFound } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { calculateTco } from "@/lib/domain/finance";
import { formatClicksFromClosed } from "@/lib/domain/setup";
import { 
  formatKm, 
  formatMinutes, 
  formatCzk, 
  formatBar, 
  formatPsi, 
  formatDateCs, 
  t 
} from "@/lib/i18n";
import { 
  SlidersHorizontal, 
  Gauge, 
  Coins, 
  Wrench, 
  Calendar, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronRight 
} from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/lib/ui";

interface BikeOverviewPageProps {
  params: Promise<{ id: string }>;
}

export default function BikeOverviewPage({ params }: BikeOverviewPageProps) {
  const { id } = use(params);
  const { 
    data, 
    getBike, 
    getBikeSetup, 
    getBikeInstalledComponents, 
    getBikeServiceSchedulesWithStatus 
  } = useVault();

  const bike = getBike(id);
  if (!bike) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-2">Kolo nenalezeno</h2>
        <Link href="/garage" className="text-brand-600 hover:underline text-xs font-semibold">
          Zpět do Garáže
        </Link>
      </div>
    );
  }

  // Load transactions for this bike
  const txs = data.financialTransactions.filter((t) => t.bikeId === id);

  // Compute TCO
  const tco = calculateTco({
    transactions: txs.map((t) => ({ type: t.type, amount: Number(t.amount) })),
    currentKm: Number(bike.currentKm),
    currentMinutes: bike.currentMinutes,
    purchaseDate: bike.purchaseDate,
    soldDate: bike.soldDate,
  });

  // Load setup, installed components, schedules, and odometer entries
  const setup = getBikeSetup(id);
  const installedComponents = getBikeInstalledComponents(id);
  const evaluatedSchedules = getBikeServiceSchedulesWithStatus(id);
  const odometerEntries = data.odometerEntries
    .filter((o) => o.bikeId === id)
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

  const overdueSchedules = evaluatedSchedules.filter((s) => s.status.urgency === "OVERDUE");
  const dueSoonSchedules = evaluatedSchedules.filter((s) => s.status.urgency === "DUE_SOON");

  // Installed components lookup
  const forkComp = installedComponents.find((c) => c.installation.slot === "FORK")?.component;
  const shockComp = installedComponents.find((c) => c.installation.slot === "REAR_SHOCK")?.component;
  const frontTireComp = installedComponents.find((c) => c.installation.slot === "FRONT_TIRE")?.component;
  const rearTireComp = installedComponents.find((c) => c.installation.slot === "REAR_TIRE")?.component;

  return (
    <div className="space-y-6 animate-fade-in">
      <BikeHeader bike={bike} />

      {/* Service Alerts (if any overdue or due soon) */}
      {(overdueSchedules.length > 0 || dueSoonSchedules.length > 0) && (
        <div className="space-y-3">
          {overdueSchedules.map((item) => (
            <div
              key={item.schedule.id}
              className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 flex items-center justify-between gap-3 text-rose-800 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-rose-900">
                    Servis po termínu: {item.schedule.name}
                  </h4>
                  <p className="text-xs text-rose-700">
                    {item.status.summaryTextCs}
                  </p>
                </div>
              </div>
              <Link
                href={`/bikes/${bike.id}/service`}
                className={buttonClass("danger", "md", "whitespace-nowrap")}
              >
                Zapsat servis
              </Link>
            </div>
          ))}

          {dueSoonSchedules.map((item) => (
            <div
              key={item.schedule.id}
              className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex items-center justify-between gap-3 text-amber-900 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-amber-900">
                    Blíží se termín servisu: {item.schedule.name}
                  </h4>
                  <p className="text-xs text-amber-800">
                    Zbývá {item.status.summaryTextCs}
                  </p>
                </div>
              </div>
              <Link
                href={`/bikes/${bike.id}/service`}
                className={buttonClass("warning", "md", "whitespace-nowrap")}
              >
                Detail
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* METRICS & TCO GRID */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Přehled provozu a nákladů (TCO)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Nájezd */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.currentMileage")}
            </span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {formatKm(bike.currentKm)}
            </span>
          </div>

          {/* Hodiny */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.ridingHours")}
            </span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {formatMinutes(bike.currentMinutes)}
            </span>
          </div>

          {/* Doba vlastnictví */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.ownershipDuration")}
            </span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {tco.ownershipMonths} {tco.ownershipMonths === 1 ? "měsíc" : tco.ownershipMonths >= 2 && tco.ownershipMonths <= 4 ? "měsíce" : "měsíců"}
            </span>
          </div>

          {/* Čisté náklady */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-all col-span-2 sm:col-span-1">
            <span className="text-xs text-brand-600 font-semibold block mb-1">
              {t("bike.metrics.netCost")}
            </span>
            <span className="text-lg font-bold text-brand-700 tabular-nums">
              {formatCzk(tco.netOwnershipCost)}
            </span>
          </div>

          {/* Cena za km */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.costPerKm")}
            </span>
            <span className="text-lg font-bold text-slate-800 tabular-nums">
              {tco.costPerKm !== null ? `${tco.costPerKm.toFixed(2)} Kč/km` : "-"}
            </span>
          </div>

          {/* Cena za hodinu */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.costPerHour")}
            </span>
            <span className="text-lg font-bold text-slate-800 tabular-nums">
              {tco.costPerHour !== null ? `${formatCzk(tco.costPerHour)}/h` : "-"}
            </span>
          </div>

          {/* Cena za měsíc */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.costPerMonth")}
            </span>
            <span className="text-lg font-bold text-slate-800 tabular-nums">
              {formatCzk(tco.costPerMonth)}/měsíc
            </span>
          </div>

          {/* Kupní cena */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.purchasePrice")}
            </span>
            <span className="text-lg font-bold text-slate-700 tabular-nums">
              {formatCzk(bike.purchasePrice)}
            </span>
          </div>

          {/* Celkové výdaje */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.totalExpenses")}
            </span>
            <span className="text-lg font-bold text-slate-700 tabular-nums">
              {formatCzk(tco.totalExpenses)}
            </span>
          </div>

          {/* Celkové příjmy */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.totalIncomes")}
            </span>
            <span className="text-lg font-bold text-emerald-600 tabular-nums">
              {formatCzk(tco.totalIncomes)}
            </span>
          </div>
        </div>
      </div>

      {/* COMPACT BIKE SETUP SUMMARY & RECENT LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compact Setup Summary Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  {t("setup.title")}
                </h3>
              </div>
              <Link
                href={`/bikes/${bike.id}/setup`}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>{t("setup.edit")}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vidlice */}
              {bike.suspensionType !== "RIGID" && (
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Vidlice
                    </span>
                    <span className="text-base font-bold text-slate-900 tabular-nums">
                      {setup?.forkPressurePsi ? formatPsi(setup.forkPressurePsi) : "- psi"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    {forkComp ? `${forkComp.manufacturer} ${forkComp.model}` : "Neosazeno"}
                  </p>
                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200/60 tabular-nums">
                    <div>Odskok: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup?.forkReboundClicks)}</span></div>
                    {setup?.forkLscClicks !== null && setup?.forkLscClicks !== undefined && (
                      <div>LSC: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.forkLscClicks)}</span></div>
                    )}
                    {setup?.forkHscClicks !== null && setup?.forkHscClicks !== undefined && (
                      <div>HSC: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.forkHscClicks)}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Tlumič */}
              {bike.suspensionType === "FULL_SUSPENSION" && (
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Tlumič
                    </span>
                    <span className="text-base font-bold text-slate-900 tabular-nums">
                      {setup?.shockPressurePsi ? formatPsi(setup.shockPressurePsi) : "- psi"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    {shockComp ? `${shockComp.manufacturer} ${shockComp.model}` : "Neosazeno"}
                  </p>
                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200/60 tabular-nums">
                    <div>SAG: <span className="text-slate-800 font-medium">{setup?.shockSagPercent ?? "-"} %</span></div>
                    <div>Odskok: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup?.shockReboundClicks)}</span></div>
                  </div>
                </div>
              )}

              {/* Přední plášť */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Přední plášť
                  </span>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {formatBar(setup?.frontTirePressureBar)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium truncate">
                  {frontTireComp ? `${frontTireComp.manufacturer} ${frontTireComp.model}` : "Neosazeno"}
                </p>
                {setup?.frontTireNotes && (
                  <p className="text-[11px] text-slate-500 italic">
                    "{setup.frontTireNotes}"
                  </p>
                )}
              </div>

              {/* Zadní plášť */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Zadní plášť
                  </span>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {formatBar(setup?.rearTirePressureBar)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium truncate">
                  {rearTireComp ? `${rearTireComp.manufacturer} ${rearTireComp.model}` : "Neosazeno"}
                </p>
                {setup?.rearTireNotes && (
                  <p className="text-[11px] text-slate-500 italic">
                    "{setup.rearTireNotes}"
                  </p>
                )}
              </div>
            </div>

            {setup?.generalNotes && (
              <div className="mt-4 p-3 bg-slate-50/80 rounded-xl text-xs text-slate-600 border border-slate-200/60">
                <span className="font-semibold text-slate-800 block mb-0.5">Poznámka k setupu:</span>
                "{setup.generalNotes}"
              </div>
            )}
          </div>
        </div>

        {/* Recent Odometer Activity */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Poslední odečty počítadla
                </h3>
              </div>
            </div>

            {odometerEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Zatím nebyly zaznamenány žádné odečty počítadla.
              </p>
            ) : (
              <div className="space-y-2.5">
                {odometerEntries.slice(0, 5).map((entry) => {
                  const deltaKmNum = Number(entry.deltaKm);
                  const isDeltaPositive = deltaKmNum >= 0;
                  return (
                    <div
                      key={entry.id}
                      className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-bold text-slate-900 tabular-nums">
                            {formatKm(entry.resultingKm)}
                          </span>
                          <span className={`text-[11px] tabular-nums font-semibold ${
                            isDeltaPositive ? "text-emerald-700" : "text-amber-800"
                          }`}>
                            ({isDeltaPositive ? `+${formatKm(entry.deltaKm)}` : formatKm(entry.deltaKm)})
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            entry.source === "STRAVA"
                              ? "bg-brand-50 text-brand-700 border-brand-200/70"
                              : "bg-slate-100 text-slate-600 border-slate-200/70"
                          }`}>
                            {entry.source === "STRAVA" ? "Strava" : "Ručně"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {entry.note || (entry.entryType === "INITIAL" ? "Výchozí stav" : entry.entryType === "CORRECTION" ? "Korekce počítadla" : "Odečet stavu počítadla")}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 block tabular-nums">
                          {formatDateCs(entry.entryDate)}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {formatMinutes(entry.resultingMinutes)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href={`/bikes/${bike.id}/history`}
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center justify-between"
          >
            <span>Zobrazit celou historii</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
