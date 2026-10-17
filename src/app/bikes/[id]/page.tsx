"use client";

import React, { use } from "react";
import { notFound } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { calculateTco, getBikeTransactions } from "@/lib/domain/finance";
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
      <div className="card empty-state py-12">
        <h2 className="text-base font-bold text-slate-800 mb-2">Kolo nenalezeno</h2>
        <Link href="/garage" className="text-signal-600 hover:underline text-xs font-semibold">
          Zpět do Garáže
        </Link>
      </div>
    );
  }

  // Load transactions for this bike
  const txs = getBikeTransactions(data.financialTransactions, data.componentInstallations, id);

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
              className="panel panel-error flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">
                    Servis po termínu: {item.schedule.name}
                  </p>
                  <p>
                    {item.status.summaryTextCs}
                  </p>
                </div>
              </div>
              <Link
                href={`/bikes/${bike.id}/service`}
                className="btn-primary shrink-0"
              >
                Zapsat servis
              </Link>
            </div>
          ))}

          {dueSoonSchedules.map((item) => (
            <div
              key={item.schedule.id}
              className="panel panel-warning flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-steel-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm">
                    Blíží se termín servisu: {item.schedule.name}
                  </p>
                  <p>
                    Zbývá {item.status.summaryTextCs}
                  </p>
                </div>
              </div>
              <Link
                href={`/bikes/${bike.id}/service`}
                className="btn-secondary shrink-0"
              >
                Detail
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* METRICS & TCO SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Přehled provozu a nákladů (TCO)
          </h2>
          <Link
            href={`/bikes/${bike.id}/finances`}
            className="btn-text"
          >
            <span>Detail financí</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Hlavní provozní ukazatele */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Nájezd */}
          <div className="card p-4">
            <span className="section-label block mb-1">
              {t("bike.metrics.currentMileage")}
            </span>
            <span className="text-xl sm:text-2xl readout text-slate-900">
              {formatKm(bike.currentKm)}
            </span>
          </div>

          {/* Hodiny */}
          <div className="card p-4">
            <span className="section-label block mb-1">
              {t("bike.metrics.ridingHours")}
            </span>
            <span className="text-xl sm:text-2xl readout text-slate-900">
              {formatMinutes(bike.currentMinutes)}
            </span>
          </div>

          {/* Doba vlastnictví */}
          <div className="card p-4">
            <span className="section-label block mb-1">
              {t("bike.metrics.ownershipDuration")}
            </span>
            <span className="text-xl sm:text-2xl readout text-slate-900">
              {tco.ownershipMonths} {tco.ownershipMonths === 1 ? "měsíc" : tco.ownershipMonths >= 2 && tco.ownershipMonths <= 4 ? "měsíce" : "měsíců"}
            </span>
          </div>

          {/* Čisté náklady TCO */}
          <div className="card p-4">
            <span className="section-label block mb-1">
              {t("bike.metrics.netCost")}
            </span>
            <span className="text-xl sm:text-2xl readout text-signal-700">
              {formatCzk(tco.netOwnershipCost)}
            </span>
          </div>
        </div>

        {/* Jednotkové náklady a bilance */}
        <div className="card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 p-3 sm:p-4">
          {/* Cena za km */}
          <div className="p-2.5 rounded-xl bg-slate-50">
            <span className="text-xs text-slate-500 block font-medium truncate">
              {t("bike.metrics.costPerKm")}
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-800 tabular-nums">
              {tco.costPerKm !== null ? `${tco.costPerKm.toFixed(2)} Kč` : "-"}
            </span>
          </div>

          {/* Cena za hodinu */}
          <div className="p-2.5 rounded-xl bg-slate-50">
            <span className="text-xs text-slate-500 block font-medium truncate">
              {t("bike.metrics.costPerHour")}
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-800 tabular-nums">
              {tco.costPerHour !== null ? `${formatCzk(tco.costPerHour)}` : "-"}
            </span>
          </div>

          {/* Cena za měsíc */}
          <div className="p-2.5 rounded-xl bg-slate-50">
            <span className="text-xs text-slate-500 block font-medium truncate">
              {t("bike.metrics.costPerMonth")}
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-800 tabular-nums">
              {formatCzk(tco.costPerMonth)}
            </span>
          </div>

          {/* Kupní cena */}
          <div className="p-2.5 rounded-xl bg-slate-50">
            <span className="text-xs text-slate-500 block font-medium truncate">
              {t("bike.metrics.purchasePrice")}
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-700 tabular-nums">
              {formatCzk(bike.purchasePrice)}
            </span>
          </div>

          {/* Celkové výdaje */}
          <div className="p-2.5 rounded-xl bg-slate-50">
            <span className="text-xs text-slate-500 block font-medium truncate">
              {t("bike.metrics.totalExpenses")}
            </span>
            <span className="text-sm sm:text-base font-bold text-rose-700 tabular-nums">
              {formatCzk(tco.totalExpenses)}
            </span>
          </div>

          {/* Celkové příjmy */}
          <div className="p-2.5 rounded-xl bg-slate-50">
            <span className="text-xs text-slate-500 block font-medium truncate">
              {t("bike.metrics.totalIncomes")}
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-700 tabular-nums">
              {formatCzk(tco.totalIncomes)}
            </span>
          </div>
        </div>
      </div>

      {/* COMPACT BIKE SETUP SUMMARY & RECENT LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compact Setup Summary Card */}
        <div className="lg:col-span-2 card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-signal-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  {t("setup.title")}
                </h2>
              </div>
              <Link
                href={`/bikes/${bike.id}/setup`}
                className="btn-text"
              >
                <span>{t("setup.edit")}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vidlice */}
              {bike.suspensionType !== "RIGID" && (
                <div className="panel panel-neutral space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="section-label">
                      Vidlice
                    </span>
                    <span className="text-base font-bold text-slate-900 tabular-nums">
                      {setup?.forkPressurePsi ? formatPsi(setup.forkPressurePsi) : "- psi"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    {forkComp ? `${forkComp.manufacturer} ${forkComp.model}` : "Neosazeno"}
                  </p>
                  <div className="text-slate-500 space-y-0.5 pt-1 border-t border-slate-200 tabular-nums">
                    {setup?.forkLscClicks !== null && setup?.forkLscClicks !== undefined && (
                      <div>LSC: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.forkLscClicks)}</span></div>
                    )}
                    {setup?.forkHscClicks !== null && setup?.forkHscClicks !== undefined && (
                      <div>HSC: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.forkHscClicks)}</span></div>
                    )}
                    {setup?.forkLsrClicks !== null && setup?.forkLsrClicks !== undefined && (
                      <div>LSR: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.forkLsrClicks)}</span></div>
                    )}
                    {setup?.forkHsrClicks !== null && setup?.forkHsrClicks !== undefined && (
                      <div>HSR: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.forkHsrClicks)}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Tlumič */}
              {bike.suspensionType === "FULL_SUSPENSION" && (
                <div className="panel panel-neutral space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="section-label">
                      Tlumič
                    </span>
                    <span className="text-base font-bold text-slate-900 tabular-nums">
                      {setup?.shockPressurePsi ? formatPsi(setup.shockPressurePsi) : "- psi"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    {shockComp ? `${shockComp.manufacturer} ${shockComp.model}` : "Neosazeno"}
                  </p>
                  <div className="text-slate-500 space-y-0.5 pt-1 border-t border-slate-200 tabular-nums">
                    <div>SAG: <span className="text-slate-800 font-medium">{setup?.shockSagPercent ?? "-"} %</span></div>
                    {setup?.shockLscClicks !== null && setup?.shockLscClicks !== undefined && (
                      <div>LSC: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.shockLscClicks)}</span></div>
                    )}
                    {setup?.shockHscClicks !== null && setup?.shockHscClicks !== undefined && (
                      <div>HSC: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.shockHscClicks)}</span></div>
                    )}
                    {setup?.shockLsrClicks !== null && setup?.shockLsrClicks !== undefined && (
                      <div>LSR: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.shockLsrClicks)}</span></div>
                    )}
                    {setup?.shockHsrClicks !== null && setup?.shockHsrClicks !== undefined && (
                      <div>HSR: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.shockHsrClicks)}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Přední plášť */}
              <div className="panel panel-neutral space-y-2">
                <div className="flex items-center justify-between">
                  <span className="section-label">
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
                  <p className="text-slate-500 italic">
                    "{setup.frontTireNotes}"
                  </p>
                )}
              </div>

              {/* Zadní plášť */}
              <div className="panel panel-neutral space-y-2">
                <div className="flex items-center justify-between">
                  <span className="section-label">
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
                  <p className="text-slate-500 italic">
                    "{setup.rearTireNotes}"
                  </p>
                )}
              </div>
            </div>

            {setup?.generalNotes && (
              <div className="mt-4 panel panel-neutral">
                <span className="font-semibold text-slate-800 block mb-0.5">Poznámka k setupu:</span>
                "{setup.generalNotes}"
              </div>
            )}
          </div>
        </div>

        {/* Recent Odometer Activity */}
        <div className="card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-signal-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Poslední záznamy nájezdu
                </h2>
              </div>
            </div>

            {odometerEntries.length === 0 ? (
              <p className="empty-state">
                Zatím nebyly zaznamenány žádné záznamy nájezdu.
              </p>
            ) : (
              <div className="space-y-2.5">
                {odometerEntries.slice(0, 5).map((entry) => {
                  const deltaKmNum = Number(entry.deltaKm);
                  const isDeltaPositive = deltaKmNum >= 0;
                  return (
                    <div
                      key={entry.id}
                      className="panel panel-neutral flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-bold text-slate-900 tabular-nums">
                            {formatKm(entry.resultingKm)}
                          </span>
                          <span className={`tabular-nums font-semibold ${
                            isDeltaPositive ? "text-emerald-700" : "text-steel-800"
                          }`}>
                            ({isDeltaPositive ? `+${formatKm(entry.deltaKm)}` : formatKm(entry.deltaKm)})
                          </span>
                          <span className={`chip ${entry.source === "STRAVA" ? "chip-signal" : "chip-neutral"}`}>
                            {entry.source === "STRAVA" ? "Strava" : "Ručně"}
                          </span>
                        </div>
                        <p className="text-slate-500 truncate max-w-[180px]">
                          {entry.note || (entry.entryType === "INITIAL" ? "Výchozí stav" : entry.entryType === "CORRECTION" ? "Korekce nájezdu" : "Záznam nájezdu")}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-slate-500 block tabular-nums whitespace-nowrap">
                          {formatDateCs(entry.entryDate)}
                        </span>
                        <span className="text-slate-500 tabular-nums">
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
            className="btn-text mt-3 self-start"
          >
            <span>Zobrazit historii nájezdu</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
